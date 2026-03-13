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

export interface DesktopShortcutAction {
  /** Unique ID for the action (e.g. 'org.zowe.terminal.tn3270.open-session') */
  id: string;
  /** Human-readable action name */
  name: string;
  /** Target plugin identifier */
  targetPluginId: string;
  /** ActionTargetMode: 'PluginCreate' | 'PluginFindAnyOrCreate' | 'PluginFindUniqueOrCreate' */
  targetMode: string;
  /** ActionType: 'Launch' | 'Message' | 'Route' | 'Focus' */
  type: string;
  /** Template for the primaryArgument passed to dispatcher.makeAction */
  primaryArgument?: any;
  /** The event context data passed to dispatcher.invokeAction */
  launchMetadata?: any;
}

export interface DesktopShortcut {
  /** Plugin to launch (always required — identifies the app for icon/label fallback) */
  pluginId: string;
  /** Grid position */
  gridRow: number;
  gridCol: number;
  /** Optional custom label (overrides the plugin's default label) */
  displayLabel?: string;
  /** Optional custom icon URL (overrides the plugin's default icon) */
  displayIcon?: string;
  /** Optional action to invoke instead of a plain launch */
  action?: DesktopShortcutAction;
}

@Injectable()
export class DesktopShortcutsService implements MVDHosting.LogoutActionInterface {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private scope: string = 'user';
  private resourcePath: string = 'ui/desktop/shortcuts';
  private fileName: string = 'shortcuts.json';
  private authenticationManager: MVDHosting.AuthenticationManagerInterface;

  static readonly ACTION_ID_PREFIX = 'org.zowe.ivydesktop.shortcutaction';

  /**
   * Generate a structured, desktop-reserved action ID for a shortcut.
   * Format: org.zowe.ivydesktop.shortcutaction.<plugin_id_underscored>.<hash>
   */
  static generateActionId(targetPluginId: string, actionData: any): string {
    const underscored = targetPluginId.replace(/\./g, '_');
    const str = JSON.stringify(actionData);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    const hex = (hash >>> 0).toString(16);
    return `${DesktopShortcutsService.ACTION_ID_PREFIX}.${underscored}.${hex}`;
  }

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

  /** Add a simple app-launch shortcut */
  addShortcut(pluginId: string): void {
    const current = this.shortcuts$.value;
    const alreadyExists = current.some(s => s.pluginId === pluginId && !s.action);
    if (alreadyExists) {
      return;
    }
    const position = this.findNextAvailablePosition(current);
    const updated: DesktopShortcut[] = [...current, { pluginId, gridRow: position.row, gridCol: position.col }];
    this.saveShortcuts(updated);
  }

  /** Add an app-to-app action shortcut with full dispatcher action details */
  addActionShortcut(shortcut: Omit<DesktopShortcut, 'gridRow' | 'gridCol'>): void {
    const current = this.shortcuts$.value;
    const position = this.findNextAvailablePosition(current);
    const updated: DesktopShortcut[] = [...current, {
      ...shortcut,
      gridRow: position.row,
      gridCol: position.col
    }];
    this.saveShortcuts(updated);
  }

  removeShortcut(pluginId: string, actionId?: string): void {
    const updated = this.shortcuts$.value.filter(s => {
      if (actionId) {
        return !(s.pluginId === pluginId && s.action?.id === actionId);
      }
      return !(s.pluginId === pluginId && !s.action);
    });
    this.saveShortcuts(updated);
  }

  removeShortcutAtPosition(row: number, col: number): void {
    const updated = this.shortcuts$.value.filter(s => !(s.gridRow === row && s.gridCol === col));
    this.saveShortcuts(updated);
  }

  moveShortcut(pluginId: string, newRow: number, newCol: number, actionId?: string): void {
    const current = this.shortcuts$.value;
    const occupied = current.some(s => s.gridRow === newRow && s.gridCol === newCol);
    if (occupied) {
      return;
    }
    const updated = current.map(s => {
      const isMatch = actionId
        ? (s.pluginId === pluginId && s.action?.id === actionId)
        : (s.pluginId === pluginId && !s.action);
      return isMatch ? { ...s, gridRow: newRow, gridCol: newCol } : s;
    });
    this.saveShortcuts(updated);
  }

  hasShortcut(pluginId: string): boolean {
    return this.shortcuts$.value.some(s => s.pluginId === pluginId && !s.action);
  }

  renameShortcut(row: number, col: number, newLabel: string): boolean {
    const current = this.shortcuts$.value;
    const isDuplicate = current.some(s =>
      !(s.gridRow === row && s.gridCol === col) && s.displayLabel === newLabel
    );
    if (isDuplicate) {
      return false;
    }
    const updated = current.map(s =>
      (s.gridRow === row && s.gridCol === col) ? { ...s, displayLabel: newLabel } : s
    );
    this.saveShortcuts(updated);
    return true;
  }

  /** Invoke a shortcut — either a plain launch or a dispatcher action */
  invokeShortcut(shortcut: DesktopShortcut, applicationManager: MVDHosting.ApplicationManagerInterface, pluginDef?: any): void {
    const targetId = shortcut.action?.targetPluginId || shortcut.pluginId;
    if (!ZoweZLUX.pluginManager.getPlugin(targetId)) {
      this.logger.warn(`Cannot launch shortcut: plugin '${targetId}' is not installed`);
      ZoweZLUX.notificationManager.notify(
        ZoweZLUX.notificationManager.createNotification('Desktop Shortcut', `Cannot open shortcut: the required application '${targetId}' is not installed.`, 1, 'org.zowe.zlux.ng2desktop')
      );
      return;
    }
    if (shortcut.action) {
      const actionDef = shortcut.action;
      const targetMode = (ZoweZLUX.dispatcher.constants.ActionTargetMode as any)[actionDef.targetMode];
      const actionType = (ZoweZLUX.dispatcher.constants.ActionType as any)[actionDef.type];
      const action = ZoweZLUX.dispatcher.makeAction(
        actionDef.id,
        actionDef.name,
        targetMode,
        actionType,
        actionDef.targetPluginId,
        actionDef.primaryArgument || null
      );
      ZoweZLUX.dispatcher.invokeAction(action, actionDef.launchMetadata || {});
    } else if (pluginDef) {
      applicationManager.spawnApplication(pluginDef, null);
    }
  }

  private findNextAvailablePosition(shortcuts: DesktopShortcut[]): { row: number; col: number } {
    const occupied = new Set(shortcuts.map(s => `${s.gridRow},${s.gridCol}`));
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
