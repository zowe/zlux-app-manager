/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable, of, zip } from 'rxjs';
import { map } from 'rxjs/operators';
import { ZosmfItem } from './zosmf-item';

@Injectable()
export class ZosmfDiscoveryService {
  public zosmfHost$ = from(ZoweZLUX.environment.get('ZOSMF_HOST'));
  public zosmfPort$ = from(ZoweZLUX.environment.get('ZOSMF_PORT'));

  private zosmfShortcutsPlugin = ZoweZLUX.pluginManager.getPlugin('org.zowe.zlux.shortcuts.zosmf');
  private zosmfShortcutsUri = this.zosmfShortcutsPlugin ? ZoweZLUX.uriBroker.pluginRESTUri(this.zosmfShortcutsPlugin, 'discovery', '') : undefined;

  constructor(
    private http: HttpClient
  ) {
  }

  get zosmfUrl$(): Observable<string | undefined> {
    return zip(this.zosmfHost$, this.zosmfPort$)
      .pipe(
        map(([host, port]) => (host && port) ? `https://${host}:${port}` : undefined)
      );
  }

  loadZosmfShortcuts(): Observable<ZosmfItem[]> {
    if (!this.zosmfShortcutsUri) {
      return of([]);
    }
    return this.loadZosmfItems(this.zosmfShortcutsUri);
  }

  private loadZosmfItems(shortcutsUrl: string): Observable<ZosmfItem[]> {
    return this.http.get(shortcutsUrl).pipe(
      map((data: {items: ZosmfItem[]}) => data.items),
      map(items => items.filter(item => !item.isLink && item.bundleUrl && item.actionInfo))
    );
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
