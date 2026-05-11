/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { BaseLogger } from 'virtual-desktop-logger';

export type SpotlightResultCategory =
  | 'Installed App'
  | 'z/OS Job'
  | 'Dataset'
  | 'USS File'
  | 'TSO Command'
  | 'APIML Service';

export interface SpotlightResult {
  category: SpotlightResultCategory;
  label: string;
  description?: string;
  icon?: string;
  action: () => void;
}

@Injectable()
export class SpotlightSearchService {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  private pluginManager: MVDHosting.PluginManagerInterface;
  private pluginDefs: DesktopPluginDefinitionImpl[] = [];

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
  }

  loadPlugins(): void {
    this.pluginManager.loadApplicationPluginDefinitions().then((defs: any[]) => {
      this.pluginDefs = defs.filter(d => {
        const baseDef = d.getBasePlugin?.()?.getBasePlugin?.();
        return baseDef && baseDef.webContent && !baseDef.isSystemPlugin;
      });
    });
  }

  /**
   * Master search -- fan out to all providers and merge results.
   *
   * Supports optional category prefixes for targeted search:
   *   job <query>       -- search z/OS jobs only
   *   dataset <query>   -- search datasets only
   *   ds <query>        -- alias for dataset
   *   uss <query>       -- search USS files only
   *   app <query>       -- search installed apps only
   *   tso <command>     -- submit TSO command
   *   api <query>       -- search APIML services only
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
      return this.searchCategory(parsed.category, parsed.query);
    }

    // Global search -- fan out to all applicable providers
    return this.globalSearch(q);
  }

  private parsePrefix(q: string): { category: string; query: string } | null {
    const prefixMap: Record<string, string> = {
      'job': 'job',
      'jobs': 'job',
      'dataset': 'dataset',
      'datasets': 'dataset',
      'ds': 'dataset',
      'uss': 'uss',
      'app': 'app',
      'apps': 'app',
      'tso': 'tso',
      'api': 'api',
      'apiml': 'api'
    };
    const spaceIdx = q.indexOf(' ');
    if (spaceIdx === -1) return null;
    const prefix = q.substring(0, spaceIdx).toLowerCase();
    const rest = q.substring(spaceIdx + 1).trim();
    if (rest.length === 0) return null;
    const category = prefixMap[prefix];
    return category ? { category, query: rest } : null;
  }

  private searchCategory(category: string, q: string): Observable<SpotlightResult[]> {
    switch (category) {
      case 'job':
        return this.searchJobs(q);
      case 'dataset':
        return this.searchDatasets(q);
      case 'uss':
        // Allow both absolute paths and relative searches
        return this.searchUssFiles(q.startsWith('/') ? q : '/' + q);
      case 'app':
        return of(this.searchInstalledApps(q));
      case 'tso':
        return of(this.buildTsoCommand(q));
      case 'api':
        return this.searchApimlServices(q);
      default:
        return of([]);
    }
  }

  private globalSearch(q: string): Observable<SpotlightResult[]> {
    const searches: Observable<SpotlightResult[]>[] = [
      of(this.searchInstalledApps(q)),
    ];

    // Dataset search: if input looks like a dataset qualifier (uppercase, dots)
    if (this.looksLikeDataset(q)) {
      searches.push(this.searchDatasets(q));
    }

    // USS path: starts with /
    if (q.startsWith('/')) {
      searches.push(this.searchUssFiles(q));
    }

    // Job search: any alphanumeric input (more inclusive for global search)
    if (this.looksLikeJobFilter(q)) {
      searches.push(this.searchJobs(q));
    }

    // APIML services
    searches.push(this.searchApimlServices(q));

    return forkJoin(searches).pipe(
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
          icon: this.getPluginIconUrl(p),
          action: () => {
            this.applicationManager.spawnApplication(p as any, null);
          }
        };
      });
  }

  private getPluginIconUrl(plugin: DesktopPluginDefinitionImpl): string | undefined {
    try {
      const baseDef = plugin.getBasePlugin?.()?.getBasePlugin?.();
      if (baseDef) {
        return ZoweZLUX.uriBroker.pluginResourceUri(baseDef, 'assets/icon.png');
      }
    } catch (e) {
      // ignore
    }
    return undefined;
  }

  // ------------------------------------------------------------------
  // z/OS Jobs (via z/OSMF REST API through the gateway)
  // ------------------------------------------------------------------
  private searchJobs(query: string): Observable<SpotlightResult[]> {
    const prefix = query.toUpperCase().replace(/[^A-Z0-9*]/g, '');
    const uri = ZoweZLUX.uriBroker.serverRootUri('ibmzosmf/api/v1/zosmf/restjobs/jobs');
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
    const dsname = query.toUpperCase();
    const uri = ZoweZLUX.uriBroker.datasetMetadataUri(dsname);

    return this.http.get<any>(uri).pipe(
      map(resp => {
        const datasets = resp?.datasets || [];
        return datasets.slice(0, 20).map((ds: any) => ({
          category: 'Dataset' as SpotlightResultCategory,
          label: ds.name || ds.dsname || dsname,
          description: `Type: ${ds.dsorg || ds.type || 'N/A'} | Vol: ${ds.volser || 'N/A'}`,
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
  // TSO Commands
  // ------------------------------------------------------------------
  private buildTsoCommand(cmd: string): SpotlightResult[] {
    if (!cmd) return [];
    return [{
      category: 'TSO Command' as SpotlightResultCategory,
      label: `Run: ${cmd}`,
      description: 'Execute TSO command via terminal',
      action: () => this.executeTsoCommand(cmd)
    }];
  }

  private executeTsoCommand(cmd: string): void {
    // Try to open tn3270 terminal with the TSO command
    const tn3270Def = this.pluginDefs.find(p => {
      const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
      return baseDef?.identifier === 'org.zowe.terminal.tn3270';
    });
    if (tn3270Def) {
      this.applicationManager.spawnApplication(tn3270Def as any, {
        data: { command: cmd }
      });
    } else {
      this.logger.warn('Spotlight: TN3270 terminal not installed, cannot run TSO command');
    }
  }

  // ------------------------------------------------------------------
  // APIML Services (via API Catalog gateway)
  // ------------------------------------------------------------------
  private searchApimlServices(query: string): Observable<SpotlightResult[]> {
    const gatewayUri = ZoweZLUX.uriBroker.serverRootUri('gateway/services');
    return this.http.get<any>(gatewayUri).pipe(
      map(resp => {
        const services = resp?.services || resp || [];
        if (!Array.isArray(services)) return [];
        const q = query.toLowerCase();
        return services
          .filter((svc: any) => {
            const id = (svc.serviceId || svc.id || '').toLowerCase();
            const title = (svc.title || '').toLowerCase();
            return id.includes(q) || title.includes(q);
          })
          .slice(0, 10)
          .map((svc: any) => ({
            category: 'APIML Service' as SpotlightResultCategory,
            label: svc.title || svc.serviceId || svc.id,
            description: `Service: ${svc.serviceId || svc.id} | Status: ${svc.status || 'N/A'}`,
            action: () => this.openApiCatalog(svc)
          }));
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
      return baseDef?.identifier === 'org.zowe.apiml.catalog';
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
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
