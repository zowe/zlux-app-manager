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
import { map, catchError, tap, take } from 'rxjs/operators';
import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { BaseLogger } from 'virtual-desktop-logger';

// Category is a plain string so external providers can define their own categories
export type SpotlightResultCategory = string;

export interface SpotlightResult {
  category: SpotlightResultCategory;
  label: string;
  description?: string;
  icon?: string;
  output?: string;
  pendingExecution?: boolean;
  historyItem?: boolean;
  /** Raw command string for history items, used by provider.removeHistoryItem() */
  historyCommand?: string;
  action: () => void;
  /** Structured metadata describing the action -- apps can inspect/extend this */
  actionMetadata?: SpotlightResultAction;
  /** For pendingExecution results -- called when the user confirms execution */
  execute?: () => Observable<SpotlightResult[]>;
  /** ID of the provider that created this result */
  providerId?: string;
}

/**
 * Structured metadata describing a spotlight result's action.
 * External providers can populate this so that the component and other
 * consumers can inspect result actions without calling the opaque action()
 * closure -- for example, to decide which icon to show, to log which plugin
 * was launched, or to re-route a result to a different target plugin.
 */
export interface SpotlightResultAction {
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
 * Interface for spotlight search providers.
 * Apps and plugins can implement this to add custom search categories.
 *
 * Register via SpotlightSearchService.registerProvider().
 */
export interface SpotlightProvider {
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
  search(query: string): Observable<SpotlightResult[]>;
  /** Return history items when prefix is typed with no query */
  getHistory?(): SpotlightResult[];
  /** Clear all history for this provider */
  clearHistory?(): void;
  /** Remove a specific item from history */
  removeHistoryItem?(cmd: string): void;
  /** When true, bare prefix (no query) suppresses the 'no results' message */
  suppressNoResults?: boolean;
}

@Injectable()
export class SpotlightSearchService implements MVDHosting.SpotlightSearchInterface {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  private pluginManager: MVDHosting.PluginManagerInterface;
  private pluginDefs: DesktopPluginDefinitionImpl[] = [];
  private readonly proxyMode: boolean;
  private readonly gatewayPrefix: string;
  private _spotlightVisible = false;
  private _lastTsoResult: SpotlightResult[] | null = null;
  private _lastTsoQuery: string = '';
  private tsoHistory: string[] = [];
  private mvsHistory: string[] = [];
  private readonly MAX_HISTORY = 20;
  private userHomeDir: string = '';
  private historySaveDebounce: any = null;
  private providers = new Map<string, SpotlightProvider>();

  constructor(
    private http: HttpClient,
    private injector: Injector
  ) {
    const uriPrefix = window.location.pathname.split('ZLUX/plugins/')[0];
    this.proxyMode = uriPrefix !== '/';
    this.gatewayPrefix = this.proxyMode ? uriPrefix.split('/zlux/')[0] + '/' : '/';
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
  }

  setVisible(visible: boolean): void {
    this._spotlightVisible = visible;
  }

  getLastTsoResult(): SpotlightResult[] | null {
    return this._lastTsoResult;
  }

  getLastTsoQuery(): string {
    return this._lastTsoQuery;
  }

  clearLastTsoResult(): void {
    this._lastTsoResult = null;
    this._lastTsoQuery = '';
  }

  // ----------------------------------------------------------------
  // Provider registry
  // ----------------------------------------------------------------

  /** Register a spotlight provider. Replaces any existing provider with the same ID. */
  registerProvider(provider: SpotlightProvider): void {
    this.providers.set(provider.id, provider);
  }

  /** Unregister a spotlight provider by ID. */
  unregisterProvider(id: string): void {
    this.providers.delete(id);
  }

  /** Get all registered providers, sorted by display order. */
  getProviders(): SpotlightProvider[] {
    return Array.from(this.providers.values()).sort((a, b) => a.order - b.order);
  }

  /** Get a provider by its ID. */
  getProvider(id: string): SpotlightProvider | undefined {
    return this.providers.get(id);
  }

  /** Get the provider that owns a given category name. */
  getProviderForCategory(category: string): SpotlightProvider | undefined {
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
      id: 'job',
      category: 'z/OS Job',
      icon: 'fa fa-cogs',
      prefixes: ['/job', '/jobs'],
      order: 20,
      canSearch: (q: string) => this.proxyMode && this.looksLikeJobFilter(q),
      search: (q: string) => {
        if (!this.proxyMode) {
          this.logger.warn('Spotlight: Job search requires the API ML gateway');
          return of([]);
        }
        return this.searchJobs(q);
      },
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

    this.registerProvider({
      id: 'tso',
      category: 'TSO Command',
      icon: 'fa fa-terminal',
      prefixes: ['/tso'],
      order: 50,
      suppressNoResults: true,
      canSearch: (_q: string) => false,
      search: (q: string) => {
        if (!this.proxyMode) {
          this.logger.warn('Spotlight: TSO commands require the API ML gateway');
          return of([]);
        }
        if (!q) return of(this.buildHistory('TSO Command', '/tso', this.tsoHistory, 'tso'));
        return of([{
          category: 'TSO Command' as SpotlightResultCategory,
          label: `TSO> ${q}`,
          description: 'Press Enter to execute',
          pendingExecution: true,
          providerId: 'tso',
          execute: () => this.submitTsoCommand(q),
          actionMetadata: { type: 'execute-command' as const, data: { command: q, commandType: 'tso' } },
          action: () => {}
        }]);
      },
      getHistory: () => this.buildHistory('TSO Command', '/tso', this.tsoHistory, 'tso'),
      clearHistory: () => {
        this.tsoHistory.length = 0;
        this.scheduleSaveHistory();
      },
      removeHistoryItem: (cmd: string) => {
        const idx = this.tsoHistory.indexOf(cmd);
        if (idx !== -1) this.tsoHistory.splice(idx, 1);
        this.scheduleSaveHistory();
      },
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
        if (!this.proxyMode) {
          this.logger.warn('Spotlight: MVS console commands require the API ML gateway');
          return of([]);
        }
        if (!q) return of(this.buildHistory('MVS Console', '/mvs', this.mvsHistory, 'console'));
        return of([{
          category: 'MVS Console' as SpotlightResultCategory,
          label: `MVS> ${q}`,
          description: 'Press Enter to execute',
          pendingExecution: true,
          providerId: 'console',
          execute: () => this.submitConsoleCommand(q),
          actionMetadata: { type: 'execute-command' as const, data: { command: q, commandType: 'mvs' } },
          action: () => {}
        }]);
      },
      getHistory: () => this.buildHistory('MVS Console', '/mvs', this.mvsHistory, 'console'),
      clearHistory: () => {
        this.mvsHistory.length = 0;
        this.scheduleSaveHistory();
      },
      removeHistoryItem: (cmd: string) => {
        const idx = this.mvsHistory.indexOf(cmd);
        if (idx !== -1) this.mvsHistory.splice(idx, 1);
        this.scheduleSaveHistory();
      },
    });

    this.registerProvider({
      id: 'api',
      category: 'APIML Service',
      icon: 'fa fa-cloud',
      prefixes: ['/api', '/apiml'],
      order: 70,
      canSearch: (q: string) => this.proxyMode && this.looksLikeServiceName(q),
      search: (q: string) => {
        if (!this.proxyMode) {
          this.logger.warn('Spotlight: APIML search requires the API ML gateway');
          return of([]);
        }
        return this.searchApimlServices(q);
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
  search(query: string): Observable<SpotlightResult[]> {
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

  private searchByProvider(providerId: string, q: string): Observable<SpotlightResult[]> {
    const provider = this.providers.get(providerId);
    if (!provider) return of([]);
    return provider.search(q);
  }

  private globalSearch(q: string): Observable<SpotlightResult[]> {
    const searches: Observable<SpotlightResult[]>[] = [];
    for (const provider of this.getProviders()) {
      if (provider.canSearch(q)) {
        searches.push(provider.search(q));
      }
    }
    if (searches.length === 0) return of([]);

    return combineLatest(searches).pipe(
      take(1),
      map(arrays => {
        const merged: SpotlightResult[] = [];
        arrays.forEach(a => merged.push(...a));
        return merged;
      })
    );
  }

  // ------------------------------------------------------------------
  // Installed Apps
  // ------------------------------------------------------------------
  private searchInstalledApps(query: string): SpotlightResult[] {
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
          category: 'Installed App' as SpotlightResultCategory,
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
  // z/OS Jobs (via z/OSMF REST API through the gateway)
  // ------------------------------------------------------------------
  private searchJobs(query: string): Observable<SpotlightResult[]> {
    const prefix = query.toUpperCase().replace(/[^A-Z0-9*]/g, '');
    // z/OSMF is registered in APIML as 'ibmzosmf' -- route via gateway
    const uri = `${this.gatewayPrefix}ibmzosmf/api/v1/zosmf/restjobs/jobs`;
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
          category: 'z/OS Job' as SpotlightResultCategory,
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
        this.logger.warn('Spotlight: job search failed', err);
        return of([]);
      })
    );
  }

  private openJobInJes(job: any): void {
    const jesDef = this.pluginDefs.find(p => {
      const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
      return baseDef?.identifier === 'org.zowe.explorer-jes';
    });
    if (jesDef) {
      this.applicationManager.spawnApplication(jesDef as any, {
        data: { owner: job.owner, prefix: job.jobname, jobId: job.jobid }
      });
    } else {
      this.logger.warn('Spotlight: JES Explorer not installed');
    }
  }

  // ------------------------------------------------------------------
  // Datasets (via ZSS datasetMetadata)
  // ------------------------------------------------------------------
  private searchDatasets(query: string): Observable<SpotlightResult[]> {
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
          category: 'Dataset' as SpotlightResultCategory,
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
        this.logger.warn('Spotlight: dataset search failed', err);
        return of([]);
      })
    );
  }

  private openDatasetInEditor(dsname: string): void {
    const editorDef = this.pluginDefs.find(p => {
      const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
      return baseDef?.identifier === 'org.zowe.editor';
    });
    if (editorDef) {
      this.applicationManager.spawnApplication(editorDef as any, {
        data: { type: 'openDataset', name: `//'${dsname}'` }
      });
    } else {
      this.logger.warn('Spotlight: Editor not installed');
    }
  }

  // ------------------------------------------------------------------
  // USS Files (via ZSS unixFileUri)
  // ------------------------------------------------------------------
  private searchUssFiles(query: string): Observable<SpotlightResult[]> {
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
          category: 'USS File' as SpotlightResultCategory,
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
        this.logger.warn('Spotlight: USS search failed', err);
        return of([]);
      })
    );
  }

  private openUssInEditor(path: string): void {
    const editorDef = this.pluginDefs.find(p => {
      const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
      return baseDef?.identifier === 'org.zowe.editor';
    });
    if (editorDef) {
      this.applicationManager.spawnApplication(editorDef as any, {
        data: { type: 'openFile', name: path }
      });
    } else {
      this.logger.warn('Spotlight: Editor not installed');
    }
  }

  private openUssInFileManager(path: string): void {
    const fmDef = this.pluginDefs.find(p => {
      const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
      return baseDef?.identifier === 'com.rs.file-manager';
    });
    if (fmDef) {
      this.applicationManager.spawnApplication(fmDef as any, {
        data: { type: 'opennewwindow', name: path }
      });
    } else {
      // Fallback to editor
      this.openUssInEditor(path);
    }
  }

  // ------------------------------------------------------------------
  // TSO Commands (via z/OSMF stateless REST API through gateway)
  // ------------------------------------------------------------------
  submitTsoCommand(cmd: string): Observable<SpotlightResult[]> {
    if (!cmd) return of([]);
    // z/OSMF TSO stateless API (z/OS 2.4+) through APIML gateway
    const uri = `${this.gatewayPrefix}ibmzosmf/api/v1/zosmf/tsoApp/v1/tso`;
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
          category: 'TSO Command' as SpotlightResultCategory,
          label: `TSO> ${cmd}`,
          description: lines.length > 0 ? lines[0] : '(no output)',
          output: output,
          actionMetadata: {
            type: 'copy' as const,
            text: output,
          },
          action: () => {
            // Copy output to clipboard
            if (navigator.clipboard) {
              navigator.clipboard.writeText(output);
            }
          }
        }];
      }),
      catchError(err => {
        this.logger.warn('Spotlight: TSO command failed', err);
        const errMsg = err?.error?.msgData?.[0]?.messageText
          || err?.message
          || 'Command failed';
        return of([{
          category: 'TSO Command' as SpotlightResultCategory,
          label: `TSO> ${cmd}`,
          description: `Error: ${errMsg}`,
          output: `Error: ${errMsg}`,
          actionMetadata: { type: 'none' as const },
          action: () => {}
        }]);
      }),
      tap(results => {
        this._lastTsoResult = results;
        this._lastTsoQuery = cmd;
        this.addToHistory(this.tsoHistory, cmd);
        if (!this._spotlightVisible) {
          this.fireTsoNotification(cmd, results);
        }
      })
    );
  }

  private fireTsoNotification(cmd: string, results: SpotlightResult[]): void {
    const nm = ZoweZLUX.notificationManager;
    if (!nm) return;
    const isError = results.length > 0 && results[0].output?.startsWith('Error:');
    const title = isError ? 'TSO Command Failed' : 'TSO Command Complete';
    const firstLine = results[0]?.description || cmd;
    const message = `${cmd} -- ${firstLine}`;
    nm.notify(nm.createNotification(title, message, 1, 'org.zowe.zlux.ng2desktop'));
  }

  // ------------------------------------------------------------------
  // MVS Console Commands (via z/OSMF REST Console API through gateway)
  // ------------------------------------------------------------------
  submitConsoleCommand(cmd: string): Observable<SpotlightResult[]> {
    if (!cmd) return of([]);
    // z/OSMF console API -- use default console name "defcn"
    const uri = `${this.gatewayPrefix}ibmzosmf/api/v1/zosmf/restconsoles/consoles/defcn`;
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
          category: 'MVS Console' as SpotlightResultCategory,
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
        this.logger.warn('Spotlight: MVS console command failed', err);
        const errMsg = err?.error?.msgData?.[0]?.messageText
          || err?.error?.message
          || err?.message
          || 'Command failed';
        return of([{
          category: 'MVS Console' as SpotlightResultCategory,
          label: `MVS> ${cmd}`,
          description: `Error: ${errMsg}`,
          output: `Error: ${errMsg}`,
          actionMetadata: { type: 'none' as const },
          action: () => {}
        }]);
      }),
      tap(results => {
        this.addToHistory(this.mvsHistory, cmd);
        if (!this._spotlightVisible) {
          this.fireConsoleNotification(cmd, results);
        }
      })
    );
  }

  private fireConsoleNotification(cmd: string, results: SpotlightResult[]): void {
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
  private searchApimlServices(query: string): Observable<SpotlightResult[]> {
    // API Catalog containers endpoint -- only available via gateway
    const gatewayUri = `${this.gatewayPrefix}apicatalog/api/v1/containers`;
    return this.http.get<any[]>(gatewayUri).pipe(
      map(containers => {
        if (!Array.isArray(containers)) return [];
        const q = query.toLowerCase();
        const results: SpotlightResult[] = [];
        for (const container of containers) {
          const services = container.services || [];
          for (const svc of services) {
            const id = (svc.serviceId || '').toLowerCase();
            const title = (svc.title || '').toLowerCase();
            if (id.includes(q) || title.includes(q)) {
              results.push({
                category: 'APIML Service' as SpotlightResultCategory,
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
        this.logger.warn('Spotlight: APIML service search failed', err);
        return of([]);
      })
    );
  }

  private openApiCatalog(service: any): void {
    const catalogDef = this.pluginDefs.find(p => {
      const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
      return baseDef?.identifier === 'org.zowe.api.catalog';
    });
    if (catalogDef) {
      this.applicationManager.spawnApplication(catalogDef as any, {
        data: { serviceId: service.serviceId || service.id }
      });
    } else {
      this.logger.info('Spotlight: API Catalog not installed');
    }
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  private looksLikeDataset(q: string): boolean {
    // Dataset names are uppercase, contain dots, letters, digits
    // Match patterns like "SYS1.PARM*", "USER.DATA", "IBMUSER.*"
    return /^[A-Z$#@][A-Z0-9$#@.*()\-]{1,43}$/i.test(q) && q.includes('.');
  }

  private looksLikeJobFilter(q: string): boolean {
    // Job names are 1-8 alphanumeric chars, possibly with wildcards
    return /^[A-Z0-9*?]{1,8}$/i.test(q) && !q.includes('.');
  }

  private looksLikeServiceName(q: string): boolean {
    // Service names are alphanumeric with hyphens/dots, not USS paths or dataset qualifiers
    return !q.startsWith('/') && /^[A-Za-z][A-Za-z0-9._-]*$/.test(q);
  }

  private addToHistory(history: string[], cmd: string): void {
    // Remove duplicate if already in history
    const idx = history.indexOf(cmd);
    if (idx !== -1) {
      history.splice(idx, 1);
    }
    // Add to front (most recent first)
    history.unshift(cmd);
    // Trim to max
    if (history.length > this.MAX_HISTORY) {
      history.length = this.MAX_HISTORY;
    }
    this.scheduleSaveHistory();
  }

  private buildHistory(category: string, prefix: string, history: string[], providerId: string): SpotlightResult[] {
    const cat = category as SpotlightResultCategory;
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

  clearHistory(category: 'tso' | 'mvs'): void {
    if (category === 'tso') {
      this.tsoHistory.length = 0;
    } else {
      this.mvsHistory.length = 0;
    }
    this.scheduleSaveHistory();
  }

  removeHistoryItem(category: 'tso' | 'mvs', cmd: string): void {
    const history = category === 'tso' ? this.tsoHistory : this.mvsHistory;
    const idx = history.indexOf(cmd);
    if (idx !== -1) {
      history.splice(idx, 1);
    }
    this.scheduleSaveHistory();
  }

  // ----------------------------------------------------------------
  // History persistence (Zowe config dataservice)
  // ----------------------------------------------------------------

  private historyConfigUri(): string {
    return ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), 'user', 'spotlight', 'history.json'
    );
  }

  private loadHistory(): void {
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
      this.logger.debug('Spotlight: command history loaded');
    });
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
      _objectType: 'org.zowe.zlux.ng2desktop.spotlight.history',
      _metaDataVersion: '1.0.0',
      tso: this.tsoHistory,
      mvs: this.mvsHistory
    };
    this.http.put(uri, payload).pipe(
      catchError(err => {
        this.logger.warn('Spotlight: failed to save command history', err);
        return of(null);
      })
    ).subscribe(() => {
      this.logger.debug('Spotlight: command history saved');
    });
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
