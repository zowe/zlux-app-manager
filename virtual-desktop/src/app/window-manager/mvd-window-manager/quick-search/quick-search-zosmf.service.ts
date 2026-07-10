/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { BaseLogger } from 'virtual-desktop-logger';
import { QuickSearchResult, QuickSearchResultCategory, QuickSearchService } from './quick-search.service';
import { QuickSearchHistoryService } from './quick-search-history.service';

/**
 * Self-contained z/OSMF quick search provider service.
 * Registers providers for z/OS Jobs, TSO commands, MVS console commands, and APIML services.
 * All HTTP calls go through the API ML gateway.
 */
@Injectable()
export class QuickSearchZosmfService {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  private pluginManager: MVDHosting.PluginManagerInterface;
  private pluginDefs: DesktopPluginDefinitionImpl[] = [];
  private readonly proxyMode: boolean;
  private readonly gatewayPrefix: string;

  constructor(
    private http: HttpClient,
    private injector: Injector,
    private searchService: QuickSearchService,
    private historyService: QuickSearchHistoryService
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

  /** Register all z/OSMF-based providers with the quick search service. */
  registerProviders(): void {
    this.searchService.registerProvider({
      id: 'job',
      category: 'z/OS Job',
      icon: 'fa fa-cogs',
      prefixes: ['/job', '/jobs'],
      order: 20,
      canSearch: (q: string) => this.proxyMode && this.looksLikeJobFilter(q),
      search: (q: string) => {
        if (!this.proxyMode) {
          this.logger.warn('Quick search: Job search requires the API ML gateway');
          return of([]);
        }
        return this.searchJobs(q);
      },
    });

    this.searchService.registerProvider({
      id: 'tso',
      category: 'TSO Command',
      icon: 'fa fa-terminal',
      prefixes: ['/tso'],
      order: 50,
      suppressNoResults: true,
      canSearch: (_q: string) => false,
      search: (q: string) => {
        if (!this.proxyMode) {
          this.logger.warn('Quick search: TSO commands require the API ML gateway');
          return of([]);
        }
        if (!q) return of(this.historyService.buildHistoryResults('TSO Command', '/tso', 'tso', 'tso'));
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
      getHistory: () => this.historyService.buildHistoryResults('TSO Command', '/tso', 'tso', 'tso'),
      clearHistory: () => this.historyService.clearHistory('tso'),
      removeHistoryItem: (cmd: string) => this.historyService.removeHistoryItem('tso', cmd),
    });

    this.searchService.registerProvider({
      id: 'console',
      category: 'MVS Console',
      icon: 'fa fa-desktop',
      prefixes: ['/mvs', '/console', '/cmd'],
      order: 60,
      suppressNoResults: true,
      canSearch: (_q: string) => false,
      search: (q: string) => {
        if (!this.proxyMode) {
          this.logger.warn('Quick search: MVS console commands require the API ML gateway');
          return of([]);
        }
        if (!q) return of(this.historyService.buildHistoryResults('MVS Console', '/mvs', 'mvs', 'console'));
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
      getHistory: () => this.historyService.buildHistoryResults('MVS Console', '/mvs', 'mvs', 'console'),
      clearHistory: () => this.historyService.clearHistory('mvs'),
      removeHistoryItem: (cmd: string) => this.historyService.removeHistoryItem('mvs', cmd),
    });

    this.searchService.registerProvider({
      id: 'api',
      category: 'APIML Service',
      icon: 'fa fa-cloud',
      prefixes: ['/api', '/apiml'],
      order: 70,
      canSearch: (q: string) => this.proxyMode && this.looksLikeServiceName(q),
      search: (q: string) => {
        if (!this.proxyMode) {
          this.logger.warn('Quick search: APIML search requires the API ML gateway');
          return of([]);
        }
        return this.searchApimlServices(q);
      },
    });
  }

  // ------------------------------------------------------------------
  // z/OS Jobs (via z/OSMF REST API through the gateway)
  // ------------------------------------------------------------------
  private searchJobs(query: string): Observable<QuickSearchResult[]> {
    const prefix = query.toUpperCase().replace(/[^A-Z0-9*]/g, '');
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
    const jesDef = this.pluginDefs.find(p => {
      const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
      return baseDef?.identifier === 'org.zowe.explorer-jes';
    });
    if (jesDef) {
      this.applicationManager.spawnApplication(jesDef as any, {
        data: { owner: job.owner, prefix: job.jobname, jobId: job.jobid }
      });
    } else {
      this.logger.warn('Quick search: JES Explorer not installed');
    }
  }

  // ------------------------------------------------------------------
  // TSO Commands (via z/OSMF stateless REST API through gateway)
  // ------------------------------------------------------------------
  submitTsoCommand(cmd: string): Observable<QuickSearchResult[]> {
    if (!cmd) return of([]);
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
        this.searchService.setLastTsoResult(results, cmd);
        this.historyService.addToHistory('tso', cmd);
        if (!this.searchService.isVisible()) {
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
  // MVS Console Commands (via z/OSMF REST Console API through gateway)
  // ------------------------------------------------------------------
  submitConsoleCommand(cmd: string): Observable<QuickSearchResult[]> {
    if (!cmd) return of([]);
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
        this.historyService.addToHistory('mvs', cmd);
        if (!this.searchService.isVisible()) {
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
    const catalogDef = this.pluginDefs.find(p => {
      const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
      return baseDef?.identifier === 'org.zowe.api.catalog';
    });
    if (catalogDef) {
      this.applicationManager.spawnApplication(catalogDef as any, {
        data: { serviceId: service.serviceId || service.id }
      });
    } else {
      this.logger.info('Quick search: API Catalog not installed');
    }
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
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
