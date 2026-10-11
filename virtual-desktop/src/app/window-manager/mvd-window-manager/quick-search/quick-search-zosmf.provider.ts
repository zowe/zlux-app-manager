/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { BaseLogger } from 'virtual-desktop-logger';
import { QuickSearchResult, QuickSearchResultCategory, QuickSearchService } from './quick-search.service';
import { QuickSearchHistory } from './quick-search-history';

/**
 * Registers the z/OSMF-backed quick search providers (z/OS jobs, TSO commands,
 * MVS console commands, and APIML services). z/OSMF calls route through the
 * API ML gateway when the desktop is served behind it, otherwise directly to
 * z/OSMF via the app-server origin.
 *
 * IMPORTANT: this is a PLAIN class, instantiated via `new` by QuickSearchService
 * and NOT an Angular @Injectable / module provider (see the note in
 * quick-search-history.ts). Splitting via composition of plain helper classes
 * keeps the code modular without adding WindowManagerModule providers, which
 * would trip the desktop's esbuild AOT/JIT threshold and break plugin loading.
 */
export class QuickSearchZosmfProvider {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;

  /** True when the desktop is served through the API ML gateway. */
  private behindGateway = false;
  /** Path prefix to the API ML gateway root (e.g. '/' or '/mygateway/'). */
  private gatewayPrefix = '/';
  /** Base URL for direct (non-gateway) z/OSMF REST calls. Overridable via config. */
  private zosmfDirectBaseUrl = '/';
  /** APIML service id under which z/OSMF is registered (gateway mode). Overridable via config. */
  private zosmfServiceId = QuickSearchZosmfProvider.DEFAULT_ZOSMF_SERVICE_ID;
  private static readonly DEFAULT_ZOSMF_SERVICE_ID = 'ibmzosmf';

  constructor(
    private http: HttpClient,
    private search: QuickSearchService,
    private history: QuickSearchHistory
  ) {
    // Derive the gateway location from the framework's already-computed server root.
    const serverRoot = ZoweZLUX.uriBroker.serverRootUri('');
    this.behindGateway = !!serverRoot && serverRoot !== '/';
    this.gatewayPrefix = this.deriveGatewayPrefix(serverRoot);
    this.zosmfDirectBaseUrl = serverRoot || '/';
  }

  /** Register all z/OSMF-based providers with the quick search service. */
  registerProviders(): void {
    this.loadConfig();

    this.search.registerProvider({
      id: 'job',
      category: 'z/OS Job',
      icon: 'fa fa-cogs',
      prefixes: ['/job', '/jobs'],
      order: 20,
      canSearch: (q: string) => this.looksLikeJobFilter(q),
      search: (q: string) => this.searchJobs(q),
    });

    this.search.registerProvider({
      id: 'tso',
      category: 'TSO Command',
      icon: 'fa fa-terminal',
      prefixes: ['/tso'],
      order: 50,
      suppressNoResults: true,
      canSearch: (_q: string) => false,
      search: (q: string) => {
        if (!q) return of(this.history.buildHistoryResults('TSO Command', '/tso', 'tso', 'tso'));
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
      getHistory: () => this.history.buildHistoryResults('TSO Command', '/tso', 'tso', 'tso'),
      clearHistory: () => this.history.clearHistory('tso'),
      removeHistoryItem: (cmd: string) => this.history.removeHistoryItem('tso', cmd),
    });

    this.search.registerProvider({
      id: 'console',
      category: 'MVS Console',
      icon: 'fa fa-desktop',
      prefixes: ['/mvs', '/console', '/cmd'],
      order: 60,
      suppressNoResults: true,
      canSearch: (_q: string) => false,
      search: (q: string) => {
        if (!q) return of(this.history.buildHistoryResults('MVS Console', '/mvs', 'mvs', 'console'));
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
      getHistory: () => this.history.buildHistoryResults('MVS Console', '/mvs', 'mvs', 'console'),
      clearHistory: () => this.history.clearHistory('mvs'),
      removeHistoryItem: (cmd: string) => this.history.removeHistoryItem('mvs', cmd),
    });

    this.search.registerProvider({
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
          action: () => this.search.launchApp('org.zowe.explorer-jes', {
            data: { owner: job.owner, prefix: job.jobname, jobId: job.jobid }
          })
        }));
      }),
      catchError(err => {
        this.logger.warn('Quick search: job search failed', err);
        return of([]);
      })
    );
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
        this.search.setLastTsoResult(results, cmd);
        this.history.addToHistory('tso', cmd);
        if (!this.search.isVisible()) {
          this.fireNotification('TSO', cmd, results);
        }
      })
    );
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
        this.history.addToHistory('mvs', cmd);
        if (!this.search.isVisible()) {
          this.fireNotification('MVS Console', cmd, results);
        }
      })
    );
  }

  /** Post a Zowe notification when a command completes while quick search is hidden. */
  private fireNotification(kind: string, cmd: string, results: QuickSearchResult[]): void {
    const nm = ZoweZLUX.notificationManager;
    if (!nm) return;
    const isError = results.length > 0 && results[0].output?.startsWith('Error:');
    const title = isError ? `${kind} Command Failed` : `${kind} Command Complete`;
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
                action: () => this.search.launchApp('org.zowe.api.catalog', {
                  data: { serviceId: svc.serviceId || svc.id }
                })
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

  // ------------------------------------------------------------------
  // Heuristics
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
