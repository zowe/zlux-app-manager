/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavigationService } from '../services/navigation.service';
import { map, mergeMap, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { ProxyService, ProxyServerResult } from '../services/proxy.service';

@Component({
  selector: 'app-browser-window',
  templateUrl: './browser-window.component.html',
  styleUrls: ['./browser-window.component.css']
})
export class BrowserWindowComponent implements OnInit, OnDestroy {
  url$: Observable<SafeResourceUrl>;
  currentProxyPort: number = 123;

  constructor(
    private domSanitizer: DomSanitizer,
    private navigation: NavigationService,
    private proxy: ProxyService,
  ) {
    this.url$ = this.navigation.urlSubject.pipe(
      tap(url => console.log(`url is ${url}`)),
      mergeMap(url => this.deletePreviousProxyServerIfNeeded().pipe(map(() => url))),
      tap(url => console.log(`url is ${url}`)),
      mergeMap(url => this.proxy.create(url)),
      map((result: ProxyServerResult) => result.port),
      tap(port => this.currentProxyPort = port),
      tap(port => console.log(`created proxy at port ${port}`)),
      map(port => `https://${location.hostname}:${port}/`),
      tap(url => console.log(`proxy url is ${url}`)),
      map(url => this.domSanitizer.bypassSecurityTrustResourceUrl(url)),
    );
  }

  ngOnInit(): void {
  }

  private deletePreviousProxyServerIfNeeded(): Observable<void> {
    console.log(`deletePreviousProxyServerIfNeeded port = ${this.currentProxyPort}`)
    if (this.currentProxyPort) {
      return this.proxy.delete(this.currentProxyPort);
    }
    return of();
  }

  ngOnDestroy(): void {
    this.deletePreviousProxyServerIfNeeded().subscribe();
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
