/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ProxyService } from './proxy.service';
import { mergeMap } from 'rxjs/operators';


@Injectable()
export class NavigationService {
  readonly startPage = 'https://www.google.ru';
  private urlSubject = new BehaviorSubject(this.startPage);
  url$: Observable<string>;
  history: string[] = [];

  constructor(private proxy: ProxyService) {
    this.url$ = this.urlSubject.pipe(mergeMap(url => this.proxy.process(url)));
  }

  navigate(url: string): void {
    this.history.push(url);
    this.urlSubject.next(url);
  }

  stop(): void {
    this.proxy.deletePreviousProxyServerIfNeeded().subscribe();
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
