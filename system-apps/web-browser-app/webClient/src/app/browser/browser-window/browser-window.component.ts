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
import { map, mergeMap, tap, mapTo, distinctUntilChanged } from 'rxjs/operators';
import { Observable, of, Subscription } from 'rxjs';
import { ProxyService, ProxyServerResult } from '../services/proxy.service';

@Component({
  selector: 'app-browser-window',
  templateUrl: './browser-window.component.html',
  styleUrls: ['./browser-window.component.scss']
})
export class BrowserWindowComponent implements OnInit, OnDestroy {
  currentProxyPort: number;
  url: SafeResourceUrl;
  urlSubscription: Subscription;

  constructor(
    private domSanitizer: DomSanitizer,
    private navigation: NavigationService,
    private proxy: ProxyService,
  ) {
    this.urlSubscription = this.navigation.urlSubject.pipe(
      distinctUntilChanged(),
      tap(url => console.log(`url is ${url}`)),
      mergeMap(url => this.deletePreviousProxyServerIfNeeded().pipe(mapTo(url))),
      tap(url => console.log(`url is ${url}`)),
      mergeMap(url => this.proxy.create(url)),
      map((result: ProxyServerResult) => result.port),
      tap(port => this.currentProxyPort = port),
      tap(port => console.log(`created proxy at port ${port}`)),
      map(port => `https://${location.hostname}:${port}/`),
      tap(url => console.log(`proxy url is ${url}`)),
      map(url => this.domSanitizer.bypassSecurityTrustResourceUrl(url)),
    ).subscribe(url => this.url = url);
  }

  ngOnInit(): void {
  }

  private deletePreviousProxyServerIfNeeded(): Observable<void | null> {
    console.log(`deletePreviousProxyServerIfNeeded port = ${this.currentProxyPort}`)
    if (this.currentProxyPort) {
      return this.proxy.delete(this.currentProxyPort);
    }
    return of(null);
  }

  ngOnDestroy(): void {
    this.deletePreviousProxyServerIfNeeded().subscribe();
    if (this.urlSubscription) {
      this.urlSubscription.unsubscribe();
    }
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
