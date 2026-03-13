/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { BaseLogger } from 'virtual-desktop-logger';

export interface DesktopShortcut {
  pluginId: string;
  gridRow: number;
  gridCol: number;
}

@Injectable()
export class DesktopShortcutsService implements MVDHosting.LogoutActionInterface {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private scope: string = 'user';
  private resourcePath: string = 'ui/desktop/shortcuts';
  private fileName: string = 'shortcuts.json';
  private authenticationManager: MVDHosting.AuthenticationManagerInterface;

  shortcuts$ = new BehaviorSubject<DesktopShortcut[]>([]);

  constructor(
    private injector: Injector,
    private http: HttpClient
  ) {
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.authenticationManager.registerPreLogoutAction(this);
  }

  onLogout(username: string): boolean {
    this.shortcuts$.next([]);
    return true;
  }

  loadShortcuts(): void {
    this.getResource().subscribe(
      (res: HttpResponse<any>) => {
        if (res.status === 204 || !res.body?.contents?.shortcuts) {
          this.shortcuts$.next([]);
        } else {
          this.shortcuts$.next(res.body.contents.shortcuts as DesktopShortcut[]);
        }
      },
      () => {
        this.shortcuts$.next([]);
      }
    );
  }

  addShortcut(pluginId: string): void {
    const current = this.shortcuts$.value;
    const alreadyExists = current.some(s => s.pluginId === pluginId);
    if (alreadyExists) {
      return;
    }
    const position = this.findNextAvailablePosition(current);
    const updated = [...current, { pluginId, gridRow: position.row, gridCol: position.col }];
    this.saveShortcuts(updated);
  }

  removeShortcut(pluginId: string): void {
    const updated = this.shortcuts$.value.filter(s => s.pluginId !== pluginId);
    this.saveShortcuts(updated);
  }

  moveShortcut(pluginId: string, newRow: number, newCol: number): void {
    const current = this.shortcuts$.value;
    const occupied = current.some(s => s.pluginId !== pluginId && s.gridRow === newRow && s.gridCol === newCol);
    if (occupied) {
      return;
    }
    const updated = current.map(s =>
      s.pluginId === pluginId ? { ...s, gridRow: newRow, gridCol: newCol } : s
    );
    this.saveShortcuts(updated);
  }

  hasShortcut(pluginId: string): boolean {
    return this.shortcuts$.value.some(s => s.pluginId === pluginId);
  }

  private findNextAvailablePosition(shortcuts: DesktopShortcut[]): { row: number; col: number } {
    const occupied = new Set(shortcuts.map(s => `${s.gridRow},${s.gridCol}`));
    // Fill column-first (top to bottom, then next column) to match typical desktop icon layout
    const maxRows = 20;
    const maxCols = 20;
    for (let col = 0; col < maxCols; col++) {
      for (let row = 0; row < maxRows; row++) {
        if (!occupied.has(`${row},${col}`)) {
          return { row, col };
        }
      }
    }
    return { row: 0, col: 0 };
  }

  private saveShortcuts(shortcuts: DesktopShortcut[]): void {
    const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), this.scope, this.resourcePath, this.fileName
    );
    const params = { shortcuts };
    this.http.put(uri, params).subscribe(
      () => {
        this.shortcuts$.next(shortcuts);
      },
      (err) => {
        this.logger.warn('Could not save desktop shortcuts', err);
      }
    );
  }

  private getResource(): Observable<HttpResponse<any>> {
    const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), this.scope, this.resourcePath, this.fileName
    );
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get(uri, { headers, observe: 'response' });
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
