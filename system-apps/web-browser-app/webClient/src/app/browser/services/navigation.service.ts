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
import { isLaunchMetadata, Bookmark } from '../shared';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

@Injectable()
export class NavigationService {
  readonly startURL: string = 'https://zowe.org';
  private rawURLSubject = new ReplaySubject<string>(1);
  rawURL$ = this.rawURLSubject.asObservable();
  iframeURL$: Observable<string>;

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
    this.iframeURL$ = this.rawURLSubject.pipe(switchMap(url => this.proxy.process(url)));
    this.navigateInternal(this.startURL);
  }

  stop(): void {
    this.proxy.stop();
  }

  refresh(): void {
    if (this.currentURL) {
      this.rawURLSubject.next(this.currentURL);
    }
  }

  navigate(url: string): void {
    this.backStack.push(this.currentURL);
    this.forwardStack = [];
    this.navigateInternal(url);
  }

  navigateUsingBookmark(bookmark: Bookmark): void {
    this.backStack.push(this.currentURL);
    this.forwardStack = [];
    this.navigateInternal(bookmark.url);
    if (!this.proxy.isEnabled() && bookmark.proxy) {
      this.proxy.toggle();
    }
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
    this.rawURLSubject.next(newURL);
    if (newURL.startsWith('http://') && !this.proxy.isEnabled()) {
      this.proxy.toggle();
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
