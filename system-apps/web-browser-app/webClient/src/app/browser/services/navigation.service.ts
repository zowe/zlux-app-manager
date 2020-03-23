/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Inject, Optional } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { ProxyService } from './proxy.service';
import { switchMap } from 'rxjs/operators';
import { isLaunchMetadata } from '../shared';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

@Injectable()
export class NavigationService {
  readonly startURL: string = 'https://zowe.org';
  private urlSubject = new ReplaySubject<string>(1);
  url$: Observable<string>;

  private currentURL: string;
  private backStack: string[] = [];
  private forwardStack: string[] = [];

  constructor(
    @Optional() @Inject(Angular2InjectionTokens.LAUNCH_METADATA)
    launchMetadata: any,
    private proxy: ProxyService
  ) {
    if (isLaunchMetadata(launchMetadata) && typeof launchMetadata.data.url === 'string') {
      this.startURL = launchMetadata.data.url;
    }
    this.url$ = this.urlSubject.pipe(switchMap(url => this.proxy.process(url)));
    this.navigateInternal(this.startURL);
  }

  stop(): void {
    this.proxy.deletePreviousProxyServerIfNeeded().subscribe();
  }

  refresh(): void {
    if (this.currentURL) {
      this.urlSubject.next(this.currentURL);
    }
  }

  navigate(url: string): void {
    this.backStack.push(this.currentURL);
    this.forwardStack = [];
    this.navigateInternal(url);
  }

  goBack(): string | undefined {
    this.forwardStack.push(this.currentURL);
    const url = this.backStack.pop();
    if (url) {
      this.navigateInternal(url);
    }
    return url;
  }

  canGoBack(): boolean {
    return this.backStack.length > 0;
  }

  goForward(): string | undefined {
    this.backStack.push(this.currentURL);
    const url = this.forwardStack.pop();
    if (url) {
      this.navigateInternal(url);
    }
    return url;
  }

  canGoForward(): boolean {
    return this.forwardStack.length > 0;
  }

  private navigateInternal(newURL: string): void {
    this.currentURL = newURL;
    this.urlSubject.next(newURL);
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
