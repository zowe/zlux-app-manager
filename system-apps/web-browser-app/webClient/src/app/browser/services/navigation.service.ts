/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { ProxyService } from './proxy.service';
import { mergeMap } from 'rxjs/operators';

@Injectable()
export class NavigationService {

  readonly startPage = 'https://www.google.ru';
  private urlSubject = new ReplaySubject<string>(1);
  url$: Observable<string>;
  history: string[] = [];

  constructor(private proxy: ProxyService) {
    this.url$ = this.urlSubject.pipe(mergeMap(url => this.proxy.process(url)));
    this.navigate(this.startPage);
  }

  navigate(url: string): void {
    this.history.push(url);
    this.urlSubject.next(url);
  }

  stop(): void {
    this.proxy.deletePreviousProxyServerIfNeeded().subscribe();
  }

  forward(): void {
    throw new Error("Method not implemented.");
  }
  back(): void {
    throw new Error("Method not implemented.");
  }

  refresh(): void {
    const lastURL = this.history[this.history.length - 1];
    if (lastURL) {
      this.urlSubject.next(lastURL);
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
