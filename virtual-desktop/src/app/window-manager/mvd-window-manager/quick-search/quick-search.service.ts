/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, take, tap } from 'rxjs/operators';
import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { BaseLogger } from 'virtual-desktop-logger';

// Category is a plain string so external providers can define their own categories
export type QuickSearchResultCategory = string;

export type HistoryCategory = 'tso' | 'mvs';

export interface QuickSearchResult {
  category: QuickSearchResultCategory;
  label: string;
  description?: string;
  icon?: string;
  output?: string;
  pendingExecution?: boolean;
  historyItem?: boolean;
  /** Raw command string for history items, used by removeHistoryItem() */
  historyCommand?: string;
  action: () => void;
  /** Structured metadata describing the action -- apps can inspect/extend this */
  actionMetadata?: QuickSearchResultAction;
  /** For pendingExecution results -- called when the user confirms execution */
  execute?: () => Observable<QuickSearchResult[]>;
  /** ID of the provider that created this result */
  providerId?: string;
}

/**
 * Structured metadata describing a quick search result's action.
 * External providers can populate this so that the component and other
 * consumers can inspect result actions without calling the opaque action()
 * closure -- for example, to decide which icon to show, to log which plugin
 * was launched, or to re-route a result to a different target plugin.
 */
export interface QuickSearchResultAction {
  /** The kind of action this result performs */
  type: 'launch-app' | 'open-file' | 'open-dataset' | 'copy' | 'execute-command' | 'none' | string;
  /** Plugin identifier of the target app (for launch-app, open-file, open-dataset) */
  targetPluginId?: string;
  /** Data payload passed to the target app */
  data?: any;
  /** File or resource path (for open-file, open-dataset) */
  path?: string;
  /** Text content (for copy actions) */
  text?: string;
}

/**
 * Interface for quick search providers.
 * Apps and plugins can implement this to add custom search categories.
 *
 * Register via QuickSearchService.registerProvider().
 */
export interface QuickSearchProvider {
  /** Unique identifier for this provider */
  id: string;
  /** Display name shown as the category header */
  category: string;
  /** Font Awesome icon class (e.g. 'fa fa-cogs') */
  icon: string;
  /** Slash-prefixed commands that route to this provider (e.g. ['/job', '/jobs']) */
  prefixes: string[];
  /** Display order -- lower numbers appear first */
  order: number;
  /** Whether this provider should participate in unprefixed (global) search */
  canSearch(query: string): boolean;
  /** Execute a search and return results */
  search(query: string): Observable<QuickSearchResult[]>;
  /** Return history items when prefix is typed with no query */
  getHistory?(): QuickSearchResult[];
  /** Clear all history for this provider */
  clearHistory?(): void;
  /** Remove a specific item from history */
  removeHistoryItem?(cmd: string): void;
  /** When true, bare prefix (no query) suppresses the 'no results' message */
  suppressNoResults?: boolean;
}

/**
 * Quick search service.
 *
 * Consolidated (monolithic) implementation containing the provider registry,
 * built-in providers (apps/datasets/USS), z/OSMF providers (jobs/TSO/MVS/APIML),
 * and command-history persistence. It is intentionally kept as a single service
 * (rather than split into separate injectables) because splitting it into
 * additional module providers reshapes the desktop bundle in a way that trips
 * the esbuild AOT/JIT threshold and breaks plugin loading.
 */
@Injectable()
export class QuickSearchService implements MVDHosting.QuickSearchInterface {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  private pluginManager: MVDHosting.PluginManagerInterface;
  private pluginDefs: DesktopPluginDefinitionImpl[] = [];
  private _quickSearchVisible = false;
  private _lastTsoResult: QuickSearchResult[] | null = null;
  private _lastTsoQuery: string = '';
  private userHomeDir: string = '';
  private providers = new Map<string, QuickSearchProvider>();

  // --- Command history state ---
  private readonly MAX_HISTORY = 20;
  private tsoHistory: string[] = [];
  private mvsHistory: string[] = [];
  private historySaveDebounce: any = null;

  // --- z/OSMF state ---
  /** True when the desktop is served through the API ML gateway. */
  private behindGateway = false;
  /** Path prefix to the API ML gateway root (e.g. '/' or '/mygateway/'). */
  private gatewayPrefix = '/';
  /** Base URL for direct (non-gateway) z/OSMF REST calls. Overridable via config. */
  private zosmfDirectBaseUrl = '/';
  /** APIML service id under which z/OSMF is registered (gateway mode). Overridable via config. */
  private zosmfServiceId = QuickSearchService.DEFAULT_ZOSMF_SERVICE_ID;
  private static readonly DEFAULT_ZOSMF_SERVICE_ID = 'ibmzosmf';

  constructor(
    private http: HttpClient,
    private injector: Injector
  ) {
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
    this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
    this.pluginManager.pluginsAdded.subscribe((plugins: DesktopPluginDefinitionImpl[]) => {
      plugins.forEach(p => {
        const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
        if (baseDef && baseDef.webContent && !baseDef.isSystemPlugin) {
          this.pluginDefs.push(p);
        }
      });
    });
    // Derive the gateway location from the framework's already-computed server root.
    const serverRoot = ZoweZLUX.uriBroker.serverRootUri('');
    this.behindGateway = !!serverRoot && serverRoot !== '/';
    this.gatewayPrefix = this.deriveGatewayPrefix(serverRoot);
    this.zosmfDirectBaseUrl = serverRoot || '/';
  }

  // ----------------------------------------------------------------
  // Visibility state
  // ----------------------------------------------------------------

  setVisible(visible: boolean): void {
    this._quickSearchVisible = visible;
  }

  isVisible(): boolean {
    return this._quickSearchVisible;
  }

  // ----------------------------------------------------------------
  // Last TSO result cache
  // ----------------------------------------------------------------

  getLastTsoResult(): QuickSearchResult[] | null {
    return this._lastTsoResult;
  }

  getLastTsoQuery(): string {
    return this._lastTsoQuery;
  }

  setLastTsoResult(results: QuickSearchResult[], query: string): void {
    this._lastTsoResult = results;
    this._lastTsoQuery = query;
  }

  clearLastTsoResult(): void {
    this._lastTsoResult = null;
    this._lastTsoQuery = '';
  }

  // ----------------------------------------------------------------
  // Provider registry
  // ----------------------------------------------------------------

  /** Register a quick search provider. Replaces any existing provider with the same ID. */
  registerProvider(provider: QuickSearchProvider): void {
    this.providers.set(provider.id, provider);
  }

  /** Unregister a quick search provider by ID. */
  unregisterProvider(id: string): void {
    this.providers.delete(id);
  }

  /** Get all registered providers, sorted by display order. */
  getProviders(): QuickSearchProvider[] {
    return Array.from(this.providers.values()).sort((a, b) => a.order - b.order);
  }

  /** Get a provider by its ID. */
  getProvider(id: string): QuickSearchProvider | undefined {
    return this.providers.get(id);
  }

  /** Get the provider that owns a given category name. */
  getProviderForCategory(category: string): QuickSearchProvider | undefined {
    const providers = Array.from(this.providers.values());
    for (let i = 0; i < providers.length; i++) {
      if (providers[i].category === category) return providers[i];
    }
    return undefined;
  }

  /** Get the icon class string for a category name. */
  getCategoryIcon(category: string): string {
    const provider = this.getProviderForCategory(category);
    return provider?.icon || 'fa fa-search';
  }

  /** Get category names in display order (derived from registered providers). */
  getCategoryOrder(): string[] {
    return this.getProviders().map(p => p.category);
  }

  /** Check if a query is a bare command prefix that should suppress 'no results'. */
  isBareCommandPrefix(query: string): boolean {
    const q = query.trim().toLowerCase();
    const providers = Array.from(this.providers.values());
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      if (!provider.suppressNoResults) continue;
      for (let j = 0; j < provider.prefixes.length; j++) {
        if (q === provider.prefixes[j]) return true;
      }
    }
    return false;
  }

  // ----------------------------------------------------------------
  // Plugin discovery
  // ----------------------------------------------------------------

  /**
   * Find a loaded application plugin definition by its identifier.
   * Returns undefined if the plugin is not installed.
   */
  resolvePlugin(identifier: string): DesktopPluginDefinitionImpl | undefined {
    return this.pluginDefs.find(p => {
      const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
      return baseDef?.identifier === identifier;
    });
  }

  // ----------------------------------------------------------------
  // Initialization
  // ----------------------------------------------------------------

  loadPlugins(): void {
    this.pluginManager.loadApplicationPluginDefinitions().then((defs: any[]) => {
      this.pluginDefs = defs.filter(d => {
        const baseDef = d.getBasePlugin?.()?.getBasePlugin?.();
        return baseDef && baseDef.webContent && !baseDef.isSystemPlugin;
      });
    });
    this.fetchHomeDir();
    this.loadHistory();
    this.registerBuiltinProviders();
    this.registerZosmfProviders();
  }

  private registerBuiltinProviders(): void {
    this.registerProvider({
      id: 'app',
      category: 'Installed App',
      icon: 'fa fa-th',
      prefixes: ['/app', '/apps'],
      order: 10,
      canSearch: (_q: string) => true,
      search: (q: string) => of(this.searchInstalledApps(q)),
    });

    this.registerProvider({
      id: 'dataset',
      category: 'Dataset',
      icon: 'fa fa-database',
      prefixes: ['/dataset', '/datasets', '/ds'],
      order: 30,
      canSearch: (q: string) => this.looksLikeDataset(q),
      search: (q: string) => this.searchDatasets(q),
    });

    this.registerProvider({
      id: 'uss',
      category: 'USS File',
      icon: 'fa fa-file-o',
      prefixes: ['/uss'],
      order: 40,
      canSearch: (q: string) => q.startsWith('/') || q.startsWith('~/'),
      search: (q: string) => {
        if (q.startsWith('~/')) {
          return this.searchUssFiles(this.resolveHomePath(q));
        }
        return this.searchUssFiles(q.startsWith('/') ? q : '/' + q);
      },
    });
  }

  private fetchHomeDir(): void {
    const uri = ZoweZLUX.uriBroker.userInfoUri();
    if (!uri) return;
    this.http.get<any>(uri).subscribe({
      next: resp => {
        if (resp?.home) {
          this.userHomeDir = resp.home.trim();
        }
      },
      error: () => {}
    });
  }

  private resolveHomePath(path: string): string {
    if (path.startsWith('~/')) {
      if (this.userHomeDir) {
        return this.userHomeDir + path.substring(1);
      }
      return '/u/' + path.substring(2);
    }
    return path;
  }

  // ----------------------------------------------------------------
  // Search orchestration
  // ----------------------------------------------------------------

  /**
   * Master search -- fan out to all providers and merge results.
   *
   * Supports optional category prefixes for targeted search:
   *   /job <query>       -- search z/OS jobs only
   *   /dataset <query>   -- search datasets only
   *   /ds <query>        -- alias for dataset
   *   /uss <query>       -- search USS files only
   *   /app <query>       -- search installed apps only
   *   /tso <command>     -- submit TSO command
   *   /mvs <command>     -- submit MVS console command
   *   /api <query>       -- search APIML services only
   *
   * Without a prefix, searches all categories using heuristics.
   */
  search(query: string): Observable<QuickSearchResult[]> {
    if (!query || query.trim().length === 0) {
      return of([]);
    }
    const q = query.trim();
    const parsed = this.parsePrefix(q);

    if (parsed) {
      // Prefix-only (no space, empty query) that could match a USS directory:
      // merge category results (e.g. history) with USS file results.
      if (parsed.query === '' && q.startsWith('/')) {
        const ussProvider = this.providers.get('uss');
        if (ussProvider) {
          return combineLatest([
            this.searchByProvider(parsed.providerId, parsed.query),
            ussProvider.search(q)
          ]).pipe(
            take(1),
            map(([catResults, ussResults]) => [...catResults, ...ussResults]),
            catchError(() => this.searchByProvider(parsed.providerId, parsed.query))
          );
        }
      }
      return this.searchByProvider(parsed.providerId, parsed.query);
    }

    // Global search -- fan out to all applicable providers
    return this.globalSearch(q);
  }

  private parsePrefix(q: string): { providerId: string; query: string } | null {
    const lowerQ = q.toLowerCase();
    const spaceIdx = q.indexOf(' ');
    const prefixPart = spaceIdx === -1 ? lowerQ : lowerQ.substring(0, spaceIdx);
    const rest = spaceIdx === -1 ? '' : q.substring(spaceIdx + 1).trim();

    const providers = Array.from(this.providers.values());
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      for (let j = 0; j < provider.prefixes.length; j++) {
        if (prefixPart === provider.prefixes[j]) {
          return { providerId: provider.id, query: rest };
        }
      }
    }
    return null;
  }

  private searchByProvider(providerId: string, q: string): Observable<QuickSearchResult[]> {
    const provider = this.providers.get(providerId);
    if (!provider) return of([]);
    return provider.search(q);
  }

  private globalSearch(q: string): Observable<QuickSearchResult[]> {
    const searches: Observable<QuickSearchResult[]>[] = [];
    for (const provider of this.getProviders()) {
      if (provider.canSearch(q)) {
        searches.push(provider.search(q));
      }
    }
    if (searches.length === 0) return of([]);

    return combineLatest(searches).pipe(
      take(1),
      map(arrays => {
        const merged: QuickSearchResult[] = [];
        arrays.forEach(a => merged.push(...a));
        return merged;
      })
    );
  }

  // ------------------------------------------------------------------
  // Installed Apps
  // ------------------------------------------------------------------
  private searchInstalledApps(query: string): QuickSearchResult[] {
    const q = query.toLowerCase();
    return this.pluginDefs
      .filter(p => {
        const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
        const label = (p.label || baseDef?.identifier || '').toLowerCase();
        return label.includes(q);
      })
      .map(p => {
        const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
        return {
          category: 'Installed App' as QuickSearchResultCategory,
          label: p.label || baseDef?.identifier || 'Unknown',
          description: baseDef?.identifier,
          icon: p.image || undefined,
          actionMetadata: {
            type: 'launch-app',
            targetPluginId: baseDef?.identifier,
          },
          action: () => {
            this.applicationManager.spawnApplication(p as any, null);
          }
        };
      });
  }

  // ------------------------------------------------------------------
  // Datasets (via ZSS datasetMetadata)
  // ------------------------------------------------------------------
  private searchDatasets(query: string): Observable<QuickSearchResult[]> {
    let dsname = query.toUpperCase();
    // Add wildcards for prefix matching and child enumeration
    if (!dsname.endsWith('*')) {
      if (dsname.endsWith('.')) {
        // Trailing dot -- search all children: HLQ. -> HLQ.**
        dsname = dsname + '**';
      } else {
        // Partial last qualifier -- autocomplete it: HLQ.PRO -> HLQ.PRO*.**
        dsname = dsname + '*.**';
      }
    }
    const uri = ZoweZLUX.uriBroker.datasetMetadataUri(dsname);

    return this.http.get<any>(uri).pipe(
      map(resp => {
        const datasets = resp?.datasets || [];
        return datasets.slice(0, 20).map((ds: any) => ({
          category: 'Dataset' as QuickSearchResultCategory,
          label: ds.name || ds.dsname || dsname,
          description: `Type: ${ds.dsorg || ds.type || 'N/A'} | Vol: ${ds.volser || 'N/A'}`,
          actionMetadata: {
            type: 'open-dataset' as const,
            targetPluginId: 'org.zowe.editor',
            path: ds.name || ds.dsname || dsname,
            data: { type: 'openDataset', name: `//'${ds.name || ds.dsname || dsname}'` },
          },
          action: () => this.openDatasetInEditor(ds.name || ds.dsname || dsname)
        }));
      }),
      catchError(err => {
        this.logger.warn('Quick search: dataset search failed', err);
        return of([]);
      })
    );
  }

  private openDatasetInEditor(dsname: string): void {
    const editorDef = this.resolvePlugin('org.zowe.editor');
    if (editorDef) {
      this.applicationManager.spawnApplication(editorDef as any, {
        data: { type: 'openDataset', name: `//'${dsname}'` }
      });
    } else {
      this.logger.warn('Quick search: Editor not installed');
    }
  }

  // ------------------------------------------------------------------
  // USS Files (via ZSS unixFileUri)
  // ------------------------------------------------------------------
  private searchUssFiles(query: string): Observable<QuickSearchResult[]> {
    // Separate the directory portion from the filename pattern
    const lastSlash = query.lastIndexOf('/');
    const dirPath = lastSlash > 0 ? query.substring(0, lastSlash) : '/';
    const filePattern = query.substring(lastSlash + 1).toLowerCase();

    const uri = ZoweZLUX.uriBroker.unixFileUri('contents', dirPath.length > 0 ? dirPath : '/');

    return this.http.get<any>(uri).pipe(
      map(resp => {
        const entries = resp?.entries || [];
        let filtered = entries;
        if (filePattern) {
          filtered = entries.filter((e: any) =>
            (e.name || '').toLowerCase().includes(filePattern)
          );
        }
        return filtered.slice(0, 20).map((entry: any) => ({
          category: 'USS File' as QuickSearchResultCategory,
          label: entry.name,
          description: `${dirPath}/${entry.name} | ${entry.directory ? 'Directory' : 'File'}`,
          actionMetadata: {
            type: 'open-file' as const,
            targetPluginId: entry.directory ? 'com.rs.file-manager' : 'org.zowe.editor',
            path: `${dirPath}/${entry.name}`,
            data: entry.directory
              ? { type: 'opennewwindow', name: `${dirPath}/${entry.name}` }
              : { type: 'openFile', name: `${dirPath}/${entry.name}` },
          },
          action: () => {
            const fullPath = `${dirPath}/${entry.name}`;
            if (entry.directory) {
              this.openUssInFileManager(fullPath);
            } else {
              this.openUssInEditor(fullPath);
            }
          }
        }));
      }),
      catchError(err => {
        this.logger.warn('Quick search: USS search failed', err);
        return of([]);
      })
    );
  }

  private openUssInEditor(path: string): void {
    const editorDef = this.resolvePlugin('org.zowe.editor');
    if (editorDef) {
      this.applicationManager.spawnApplication(editorDef as any, {
        data: { type: 'openFile', name: path }
      });
    } else {
      this.logger.warn('Quick search: Editor not installed');
    }
  }

  private openUssInFileManager(path: string): void {
    const fmDef = this.resolvePlugin('com.rs.file-manager');
    if (fmDef) {
      this.applicationManager.spawnApplication(fmDef as any, {
        data: { type: 'opennewwindow', name: path }
      });
    } else {
      // Fallback to editor
      this.openUssInEditor(path);
    }
  }

  // ==================================================================
  // z/OSMF providers (jobs / TSO / MVS console / APIML)
  // ==================================================================

  /** Register all z/OSMF-based providers. */
  private registerZosmfProviders(): void {
    this.loadConfig();

    this.registerProvider({
      id: 'job',
      category: 'z/OS Job',
      icon: 'fa fa-cogs',
      prefixes: ['/job', '/jobs'],
      order: 20,
      canSearch: (q: string) => this.looksLikeJobFilter(q),
      search: (q: string) => this.searchJobs(q),
    });

    this.registerProvider({
      id: 'tso',
      category: 'TSO Command',
      icon: 'fa fa-terminal',
      prefixes: ['/tso'],
      order: 50,
      suppressNoResults: true,
      canSearch: (_q: string) => false,
      search: (q: string) => {
        if (!q) return of(this.buildHistoryResults('TSO Command', '/tso', 'tso', 'tso'));
        return of([{
          category: 'TSO Command' as QuickSearchResultCategory,
          label: `TSO> ${q}`,
          description: 'Press Enter to execute',
          pendingExecution: true,
          providerId: 'tso',
          execute: () => this.submitTsoCommand(q),
          actionMetadata: { type: 'execute-command' as const, data: { command: q, commandType: 'tso' } },
          action: () => {}
        }]);
      },
      getHistory: () => this.buildHistoryResults('TSO Command', '/tso', 'tso', 'tso'),
      clearHistory: () => this.clearHistory('tso'),
      removeHistoryItem: (cmd: string) => this.removeHistoryItem('tso', cmd),
    });

    this.registerProvider({
      id: 'console',
      category: 'MVS Console',
      icon: 'fa fa-desktop',
      prefixes: ['/mvs', '/console', '/cmd'],
      order: 60,
      suppressNoResults: true,
      canSearch: (_q: string) => false,
      search: (q: string) => {
        if (!q) return of(this.buildHistoryResults('MVS Console', '/mvs', 'mvs', 'console'));
        return of([{
          category: 'MVS Console' as QuickSearchResultCategory,
          label: `MVS> ${q}`,
          description: 'Press Enter to execute',
          pendingExecution: true,
          providerId: 'console',
          execute: () => this.submitConsoleCommand(q),
          actionMetadata: { type: 'execute-command' as const, data: { command: q, commandType: 'mvs' } },
          action: () => {}
        }]);
      },
      getHistory: () => this.buildHistoryResults('MVS Console', '/mvs', 'mvs', 'console'),
      clearHistory: () => this.clearHistory('mvs'),
      removeHistoryItem: (cmd: string) => this.removeHistoryItem('mvs', cmd),
    });

    this.registerProvider({
      id: 'api',
      category: 'APIML Service',
      icon: 'fa fa-cloud',
      prefixes: ['/api', '/apiml'],
      order: 70,
      canSearch: (q: string) => this.behindGateway && this.looksLikeServiceName(q),
      search: (q: string) => {
        if (!this.behindGateway) {
          this.logger.warn('Quick search: APIML service search requires the API ML gateway');
          return of([]);
        }
        return this.searchApimlServices(q);
      },
    });
  }

  /**
   * Load overridable settings from the desktop plugin config so the z/OSMF
   * location is not hardcoded (zosmfServiceId, zosmfDirectBaseUrl).
   */
  private loadConfig(): void {
    const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), 'instance', 'quickSearch', 'config.json'
    );
    this.http.get<any>(uri).pipe(catchError(() => of(null))).subscribe(resp => {
      const data = resp?.contents || resp;
      const id = data?.zosmfServiceId;
      if (typeof id === 'string' && id.trim().length > 0) {
        this.zosmfServiceId = id.trim();
        this.logger.debug(`Quick search: using configured z/OSMF service id '${this.zosmfServiceId}'`);
      }
      const directBase = data?.zosmfDirectBaseUrl;
      if (typeof directBase === 'string' && directBase.trim().length > 0) {
        const trimmed = directBase.trim();
        this.zosmfDirectBaseUrl = trimmed.endsWith('/') ? trimmed : trimmed + '/';
        this.logger.debug(`Quick search: using configured direct z/OSMF base URL '${this.zosmfDirectBaseUrl}'`);
      }
    });
  }

  /**
   * Compute the path to the API ML gateway root from the app-server's server
   * root URI. Behind the gateway the app-server is registered under the 'zlux'
   * service, so everything preceding that segment is the gateway root.
   */
  private deriveGatewayPrefix(serverRoot: string): string {
    if (!serverRoot || serverRoot === '/') {
      return '/';
    }
    const marker = '/zlux/';
    const idx = serverRoot.indexOf(marker);
    if (idx >= 0) {
      return serverRoot.substring(0, idx) + '/';
    }
    return serverRoot.endsWith('/') ? serverRoot : serverRoot + '/';
  }

  /**
   * Build a z/OSMF REST API URI. When behind the gateway the request routes
   * through APIML; otherwise it is sent directly to z/OSMF via the app-server
   * origin (or a configured base URL).
   */
  private zosmfApiUri(path: string): string {
    if (this.behindGateway) {
      return `${this.gatewayPrefix}${this.zosmfServiceId}/api/v1/zosmf/${path}`;
    }
    return `${this.zosmfDirectBaseUrl}zosmf/${path}`;
  }

  // ------------------------------------------------------------------
  // z/OS Jobs (via z/OSMF REST API)
  // ------------------------------------------------------------------
  private searchJobs(query: string): Observable<QuickSearchResult[]> {
    const prefix = query.toUpperCase().replace(/[^A-Z0-9*]/g, '');
    const uri = this.zosmfApiUri('restjobs/jobs');
    const params = new HttpParams()
      .set('prefix', prefix || '*')
      .set('owner', '*')
      .set('max-jobs', '20');
    const headers = new HttpHeaders({
      'Accept': 'application/json',
      'X-CSRF-ZOSMF-HEADER': '*'
    });

    return this.http.get<any[]>(uri, { params, headers }).pipe(
      map(jobs => {
        if (!Array.isArray(jobs)) return [];
        return jobs.map(job => ({
          category: 'z/OS Job' as QuickSearchResultCategory,
          label: `${job.jobname} (${job.jobid})`,
          description: `Owner: ${job.owner} | Status: ${job.status || 'UNKNOWN'}`,
          actionMetadata: {
            type: 'launch-app' as const,
            targetPluginId: 'org.zowe.explorer-jes',
            data: { owner: job.owner, prefix: job.jobname, jobId: job.jobid },
          },
          action: () => this.openJobInJes(job)
        }));
      }),
      catchError(err => {
        this.logger.warn('Quick search: job search failed', err);
        return of([]);
      })
    );
  }

  private openJobInJes(job: any): void {
    const jesDef = this.resolvePlugin('org.zowe.explorer-jes');
    if (jesDef) {
      this.applicationManager.spawnApplication(jesDef as any, {
        data: { owner: job.owner, prefix: job.jobname, jobId: job.jobid }
      });
    } else {
      this.logger.warn('Quick search: JES Explorer not installed');
    }
  }

  // ------------------------------------------------------------------
  // TSO Commands (via z/OSMF stateless REST API)
  // ------------------------------------------------------------------
  submitTsoCommand(cmd: string): Observable<QuickSearchResult[]> {
    if (!cmd) return of([]);
    const uri = this.zosmfApiUri('tsoApp/v1/tso');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-CSRF-ZOSMF-HEADER': '*'
    });
    const body = {
      tsoCmd: cmd,
      cmdState: 'stateless'
    };

    return this.http.put<any>(uri, body, { headers }).pipe(
      map(resp => {
        const lines: string[] = (resp?.cmdResponse || [])
          .map((item: any) => item.message || '')
          .filter((line: string) => line.trim().length > 0);
        const output = lines.join('\n') || '(no output)';
        return [{
          category: 'TSO Command' as QuickSearchResultCategory,
          label: `TSO> ${cmd}`,
          description: lines.length > 0 ? lines[0] : '(no output)',
          output: output,
          actionMetadata: {
            type: 'copy' as const,
            text: output,
          },
          action: () => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(output);
            }
          }
        }];
      }),
      catchError(err => {
        this.logger.warn('Quick search: TSO command failed', err);
        const errMsg = err?.error?.msgData?.[0]?.messageText
          || err?.message
          || 'Command failed';
        return of([{
          category: 'TSO Command' as QuickSearchResultCategory,
          label: `TSO> ${cmd}`,
          description: `Error: ${errMsg}`,
          output: `Error: ${errMsg}`,
          actionMetadata: { type: 'none' as const },
          action: () => {}
        }]);
      }),
      tap(results => {
        this.setLastTsoResult(results, cmd);
        this.addToHistory('tso', cmd);
        if (!this.isVisible()) {
          this.fireTsoNotification(cmd, results);
        }
      })
    );
  }

  private fireTsoNotification(cmd: string, results: QuickSearchResult[]): void {
    const nm = ZoweZLUX.notificationManager;
    if (!nm) return;
    const isError = results.length > 0 && results[0].output?.startsWith('Error:');
    const title = isError ? 'TSO Command Failed' : 'TSO Command Complete';
    const firstLine = results[0]?.description || cmd;
    const message = `${cmd} -- ${firstLine}`;
    nm.notify(nm.createNotification(title, message, 1, 'org.zowe.zlux.ng2desktop'));
  }

  // ------------------------------------------------------------------
  // MVS Console Commands (via z/OSMF REST Console API)
  // ------------------------------------------------------------------
  submitConsoleCommand(cmd: string): Observable<QuickSearchResult[]> {
    if (!cmd) return of([]);
    const uri = this.zosmfApiUri('restconsoles/consoles/defcn');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-CSRF-ZOSMF-HEADER': '*'
    });
    const body = { cmd: cmd };

    return this.http.put<any>(uri, body, { headers }).pipe(
      map(resp => {
        const raw = resp?.['cmd-response'] || '';
        const output = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim() || '(no output)';
        const firstLine = output.split('\n')[0];
        return [{
          category: 'MVS Console' as QuickSearchResultCategory,
          label: `MVS> ${cmd}`,
          description: firstLine,
          output: output,
          actionMetadata: {
            type: 'copy' as const,
            text: output,
          },
          action: () => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(output);
            }
          }
        }];
      }),
      catchError(err => {
        this.logger.warn('Quick search: MVS console command failed', err);
        const errMsg = err?.error?.msgData?.[0]?.messageText
          || err?.error?.message
          || err?.message
          || 'Command failed';
        return of([{
          category: 'MVS Console' as QuickSearchResultCategory,
          label: `MVS> ${cmd}`,
          description: `Error: ${errMsg}`,
          output: `Error: ${errMsg}`,
          actionMetadata: { type: 'none' as const },
          action: () => {}
        }]);
      }),
      tap(results => {
        this.addToHistory('mvs', cmd);
        if (!this.isVisible()) {
          this.fireConsoleNotification(cmd, results);
        }
      })
    );
  }

  private fireConsoleNotification(cmd: string, results: QuickSearchResult[]): void {
    const nm = ZoweZLUX.notificationManager;
    if (!nm) return;
    const isError = results.length > 0 && results[0].output?.startsWith('Error:');
    const title = isError ? 'MVS Console Command Failed' : 'MVS Console Command Complete';
    const firstLine = results[0]?.description || cmd;
    const message = `${cmd} -- ${firstLine}`;
    nm.notify(nm.createNotification(title, message, 1, 'org.zowe.zlux.ng2desktop'));
  }

  // ------------------------------------------------------------------
  // APIML Services (via API Catalog gateway)
  // ------------------------------------------------------------------
  private searchApimlServices(query: string): Observable<QuickSearchResult[]> {
    const gatewayUri = `${this.gatewayPrefix}apicatalog/api/v1/containers`;
    return this.http.get<any[]>(gatewayUri).pipe(
      map(containers => {
        if (!Array.isArray(containers)) return [];
        const q = query.toLowerCase();
        const results: QuickSearchResult[] = [];
        for (const container of containers) {
          const services = container.services || [];
          for (const svc of services) {
            const id = (svc.serviceId || '').toLowerCase();
            const title = (svc.title || '').toLowerCase();
            if (id.includes(q) || title.includes(q)) {
              results.push({
                category: 'APIML Service' as QuickSearchResultCategory,
                label: svc.title || svc.serviceId,
                description: `Service: ${svc.serviceId} | Status: ${svc.status || 'N/A'}`,
                actionMetadata: {
                  type: 'launch-app' as const,
                  targetPluginId: 'org.zowe.api.catalog',
                  data: { serviceId: svc.serviceId || svc.id },
                },
                action: () => this.openApiCatalog(svc)
              });
            }
          }
        }
        return results.slice(0, 10);
      }),
      catchError(err => {
        this.logger.warn('Quick search: APIML service search failed', err);
        return of([]);
      })
    );
  }

  private openApiCatalog(service: any): void {
    const catalogDef = this.resolvePlugin('org.zowe.api.catalog');
    if (catalogDef) {
      this.applicationManager.spawnApplication(catalogDef as any, {
        data: { serviceId: service.serviceId || service.id }
      });
    } else {
      this.logger.info('Quick search: API Catalog not installed');
    }
  }

  // ==================================================================
  // Command history persistence (via the Zowe config dataservice)
  // ==================================================================

  /** Load persisted history from the Zowe config dataservice. */
  loadHistory(): void {
    const uri = this.historyConfigUri();
    this.http.get<any>(uri).pipe(
      catchError(() => of(null))
    ).subscribe(resp => {
      const data = resp?.contents || resp;
      if (data) {
        if (Array.isArray(data.tso)) {
          this.tsoHistory = data.tso.slice(0, this.MAX_HISTORY);
        }
        if (Array.isArray(data.mvs)) {
          this.mvsHistory = data.mvs.slice(0, this.MAX_HISTORY);
        }
      }
      this.logger.debug('Quick search: command history loaded');
    });
  }

  /** Add a command to the front of the named history list. */
  addToHistory(category: HistoryCategory, cmd: string): void {
    const history = this.getHistoryArray(category);
    const idx = history.indexOf(cmd);
    if (idx !== -1) {
      history.splice(idx, 1);
    }
    history.unshift(cmd);
    if (history.length > this.MAX_HISTORY) {
      history.length = this.MAX_HISTORY;
    }
    this.scheduleSaveHistory();
  }

  /** Get the raw history strings for a category. */
  getHistory(category: HistoryCategory): string[] {
    return this.getHistoryArray(category);
  }

  /** Clear all history for a category. */
  clearHistory(category: HistoryCategory): void {
    this.getHistoryArray(category).length = 0;
    this.scheduleSaveHistory();
  }

  /** Remove a single item from a category's history. */
  removeHistoryItem(category: HistoryCategory, cmd: string): void {
    const history = this.getHistoryArray(category);
    const idx = history.indexOf(cmd);
    if (idx !== -1) {
      history.splice(idx, 1);
    }
    this.scheduleSaveHistory();
  }

  /**
   * Build QuickSearchResult[] for the history of a given category.
   * Used by providers to return history when a bare prefix is typed.
   */
  buildHistoryResults(category: string, prefix: string, historyCategory: HistoryCategory, providerId: string): QuickSearchResult[] {
    const history = this.getHistoryArray(historyCategory);
    const cat = category as QuickSearchResultCategory;
    return history.map(cmd => ({
      category: cat,
      label: prefix + ' ' + cmd,
      description: 'Recent command',
      historyItem: true,
      historyCommand: cmd,
      providerId: providerId,
      actionMetadata: { type: 'none' as const },
      action: () => {}
    }));
  }

  private getHistoryArray(category: HistoryCategory): string[] {
    return category === 'tso' ? this.tsoHistory : this.mvsHistory;
  }

  private historyConfigUri(): string {
    return ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), 'user', 'quickSearch', 'history.json'
    );
  }

  private scheduleSaveHistory(): void {
    if (this.historySaveDebounce !== null) {
      clearTimeout(this.historySaveDebounce);
    }
    this.historySaveDebounce = setTimeout(() => {
      this.historySaveDebounce = null;
      this.saveHistory();
    }, 1000);
  }

  private saveHistory(): void {
    const uri = this.historyConfigUri();
    const payload = {
      _objectType: 'org.zowe.zlux.ng2desktop.quickSearch.history',
      _metaDataVersion: '1.0.0',
      tso: this.tsoHistory,
      mvs: this.mvsHistory
    };
    this.http.put(uri, payload).pipe(
      catchError(err => {
        this.logger.warn('Quick search: failed to save command history', err);
        return of(null);
      })
    ).subscribe(() => {
      this.logger.debug('Quick search: command history saved');
    });
  }

  // ------------------------------------------------------------------
  // Heuristics
  // ------------------------------------------------------------------
  private looksLikeDataset(q: string): boolean {
    // Dataset names are uppercase, contain dots, letters, digits
    return /^[A-Z$#@][A-Z0-9$#@.*()\-]{1,43}$/i.test(q) && q.includes('.');
  }

  private looksLikeJobFilter(q: string): boolean {
    return /^[A-Z0-9*?]{1,8}$/i.test(q) && !q.includes('.');
  }

  private looksLikeServiceName(q: string): boolean {
    return !q.startsWith('/') && /^[A-Za-z][A-Za-z0-9._-]*$/.test(q);
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
