/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Inject, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, Subject } from 'rxjs';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { isLaunchMetadata } from '../shared';


export interface ProxyServerResult {
  port: number;
}

@Injectable()
export class ProxyService {
  readonly proxyServiceURL: string;
  private enabled = false;
  proxyState = new BehaviorSubject<boolean>(this.enabled);
  proxyError = new Subject<void>();
  currentProxyPort: number;

  constructor(
    private http: HttpClient,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION)
    private pluginDefinition: ZLUX.ContainerPluginDefinition,
    @Optional() @Inject(Angular2InjectionTokens.LAUNCH_METADATA)
    launchMetadata: any,
  ) {
    this.proxyServiceURL = ZoweZLUX.uriBroker.pluginRESTUri(this.pluginDefinition.getBasePlugin(), 'proxy', '');
    if (isLaunchMetadata(launchMetadata) && launchMetadata.data.enableProxy) {
      this.enabled = true;
    }
  }

  private create(urlString: string): Observable<ProxyServerResult> {
    const url = new URL(urlString);
    const target = `${url.protocol}//${url.host}`;
    return this.http.post<ProxyServerResult>(this.proxyServiceURL, { url: target });
  }

  private delete(port: number): Observable<void> {
    return this.http.delete<void>(`${this.proxyServiceURL}?port=${port}`);
  }

  process(url: string): Observable<string> {
    console.log(`process url ${url}`);
    return this.proxyState.pipe(
      tap(state => console.log(`state = ${state} ${this.enabled}`)),
      switchMap(() => this.deletePreviousProxyServerIfNeeded()),
      switchMap(() => this.createProxyIfNeeded(url).pipe(catchError(err => {
        this.enabled = false;
        this.proxyError.next();
        return of(url);
      }))),
    )
  }

  private createProxyIfNeeded(url: string): Observable<string> {
    if (this.enabled) {
      return this.create(url).pipe(
        map((result: ProxyServerResult) => result.port),
        tap(port => this.currentProxyPort = port),
        tap(port => console.log(`created proxy at port ${port} for url ${url}`)),
        map(port => `https://${location.hostname}:${port}/`),
        tap(proxyURL => console.log(`proxy url is ${proxyURL}`)),
      );
    }
    console.log(`createProxyIfNeeded proxy disabled ${url}`);
    return of(url);
  }

  deletePreviousProxyServerIfNeeded(): Observable<void | null> {
    console.log(`deletePreviousProxyServerIfNeeded port = ${this.currentProxyPort}`)
    if (this.currentProxyPort) {
      return this.delete(this.currentProxyPort);
    }
    return of(null);
  }

  toggle(): void {
    this.enabled = !this.enabled;
    this.proxyState.next(this.enabled);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

}



/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
