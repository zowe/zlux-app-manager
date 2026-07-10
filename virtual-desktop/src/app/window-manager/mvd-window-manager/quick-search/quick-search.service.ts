/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';
import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { BaseLogger } from 'virtual-desktop-logger';
import { QuickSearchHistoryService, HistoryCategory } from './quick-search-history.service';

// Category is a plain string so external providers can define their own categories
export type QuickSearchResultCategory = string;

export interface QuickSearchResult {
  category: QuickSearchResultCategory;
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

  constructor(
    private http: HttpClient,
    private injector: Injector,
    private historyService: QuickSearchHistoryService
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
  // Last TSO result cache (set by QuickSearchZosmfService)
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
  // History convenience (delegates to QuickSearchHistoryService)
  // ----------------------------------------------------------------

  removeHistoryItem(category: HistoryCategory, cmd: string): void {
    this.historyService.removeHistoryItem(category, cmd);
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
    this.historyService.loadHistory();
    this.registerBuiltinProviders();
    // Lazy-load QuickSearchZosmfService to avoid circular DI
    const { QuickSearchZosmfService } = require('./quick-search-zosmf.service');
    const zosmfService = this.injector.get(QuickSearchZosmfService);
    zosmfService.registerProviders();
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
    const editorDef = this.pluginDefs.find(p => {
      const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
      return baseDef?.identifier === 'org.zowe.editor';
    });
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
    const editorDef = this.pluginDefs.find(p => {
      const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
      return baseDef?.identifier === 'org.zowe.editor';
    });
    if (editorDef) {
      this.applicationManager.spawnApplication(editorDef as any, {
        data: { type: 'openFile', name: path }
      });
    } else {
      this.logger.warn('Quick search: Editor not installed');
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
  // Helpers
  // ------------------------------------------------------------------
  private looksLikeDataset(q: string): boolean {
    // Dataset names are uppercase, contain dots, letters, digits
    // Match patterns like "SYS1.PARM*", "USER.DATA", "IBMUSER.*"
    return /^[A-Z$#@][A-Z0-9$#@.*()\-]{1,43}$/i.test(q) && q.includes('.');
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
