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
  /** If set, this shortcut belongs to a folder rather than the top-level desktop grid */
  folderId?: string;
  /** ISO-8601 timestamp of when the shortcut was created */
  createdDate?: string;
  /** ISO-8601 timestamp of the last modification (rename, move, icon change, metadata edit) */
  modifiedDate?: string;
  /** ISO-8601 timestamp of the last time the shortcut was launched */
  lastOpenedDate?: string;
}

export interface DesktopFolder {
  /** Unique identifier for this folder */
  id: string;
  /** User-visible name */
  name: string;
  /** Grid position on the desktop (or -1/-1 if only in taskbar/launch menu) */
  gridRow: number;
  gridCol: number;
  /** Optional custom icon URL (overrides the auto-generated child icon grid) */
  displayIcon?: string;
  /** ISO-8601 timestamp of when the folder was created */
  createdDate: string;
  /** ISO-8601 timestamp of the last structural modification (add/remove/rename) */
  modifiedDate: string;
  /** ISO-8601 timestamp of the last time the folder was opened/expanded */
  lastOpenedDate: string;
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
  folders$ = new BehaviorSubject<DesktopFolder[]>([]);
  pinnedFolderIds$ = new BehaviorSubject<string[]>([]);
  launchMenuFolderIds$ = new BehaviorSubject<string[]>([]);

  private static generateFolderId(): string {
    return 'folder-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
  }

  constructor(
    private injector: Injector,
    private http: HttpClient
  ) {
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.authenticationManager.registerPreLogoutAction(this);
  }

  onLogout(username: string): boolean {
    this.shortcuts$.next([]);
    this.folders$.next([]);
    this.pinnedFolderIds$.next([]);
    this.launchMenuFolderIds$.next([]);
    return true;
  }

  loadShortcuts(): void {
    this.getResource().subscribe(
      (res: HttpResponse<any>) => {
        if (res.status === 204 || !res.body?.contents) {
          this.shortcuts$.next([]);
          this.folders$.next([]);
          this.pinnedFolderIds$.next([]);
          this.launchMenuFolderIds$.next([]);
        } else {
          this.shortcuts$.next((res.body.contents.shortcuts || []) as DesktopShortcut[]);
          this.folders$.next((res.body.contents.folders || []) as DesktopFolder[]);
          this.pinnedFolderIds$.next((res.body.contents.pinnedFolderIds || []) as string[]);
          this.launchMenuFolderIds$.next((res.body.contents.launchMenuFolderIds || []) as string[]);
        }
      },
      () => {
        this.shortcuts$.next([]);
        this.folders$.next([]);
        this.pinnedFolderIds$.next([]);
        this.launchMenuFolderIds$.next([]);
      }
    );
  }

  /**
   * Reload shortcuts from the server after an external app modified them.
   * Only updates shortcuts — folders and pinnedFolderIds are owned by the
   * desktop and are never accepted from external writes.
   */
  reloadShortcutsExternal(): void {
    this.getResource().subscribe(
      (res: HttpResponse<any>) => {
        if (res.status === 204 || !res.body?.contents) {
          this.shortcuts$.next([]);
        } else {
          const incomingShortcuts = (res.body.contents.shortcuts || []) as DesktopShortcut[];
          this.shortcuts$.next(incomingShortcuts);
          // Write back with our authoritative folders/pinnedFolderIds in case the
          // external app omitted or corrupted them.
          this.saveAll(incomingShortcuts, this.folders$.value);
        }
      },
      () => {
        // Network error — don't touch anything
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
    const now = new Date().toISOString();
    const position = this.findNextAvailablePosition(current);
    const updated: DesktopShortcut[] = [...current, { pluginId, gridRow: position.row, gridCol: position.col, createdDate: now, modifiedDate: now }];
    this.saveShortcuts(updated);
  }

  /** Add an app-to-app action shortcut with full dispatcher action details */
  addActionShortcut(shortcut: Omit<DesktopShortcut, 'gridRow' | 'gridCol'>): void {
    const current = this.shortcuts$.value;
    const now = new Date().toISOString();
    const position = this.findNextAvailablePosition(current);
    const updated: DesktopShortcut[] = [...current, {
      ...shortcut,
      gridRow: position.row,
      gridCol: position.col,
      createdDate: now,
      modifiedDate: now
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
    const topLevel = current.filter(s => !s.folderId);
    const folders = this.folders$.value;
    const occupied = topLevel.some(s => s.gridRow === newRow && s.gridCol === newCol)
      || folders.some(f => f.gridRow === newRow && f.gridCol === newCol);
    if (occupied) {
      return;
    }
    const updated = current.map(s => {
      const isMatch = actionId
        ? (s.pluginId === pluginId && s.action?.id === actionId)
        : (s.pluginId === pluginId && !s.action);
      return isMatch ? { ...s, gridRow: newRow, gridCol: newCol, modifiedDate: new Date().toISOString() } : s;
    });
    this.saveShortcuts(updated);
  }

  hasShortcut(pluginId: string): boolean {
    return this.shortcuts$.value.some(s => s.pluginId === pluginId && !s.action);
  }

  renameShortcut(row: number, col: number, newLabel: string, updateActionName?: boolean): boolean {
    const current = this.shortcuts$.value;
    const isDuplicate = current.some(s =>
      !(s.gridRow === row && s.gridCol === col) && s.displayLabel === newLabel
    );
    if (isDuplicate) {
      return false;
    }
    const updated = current.map(s => {
      if (s.gridRow === row && s.gridCol === col) {
        const renamed = { ...s, displayLabel: newLabel, modifiedDate: new Date().toISOString() };
        if (updateActionName && renamed.action?.launchMetadata?.data) {
          renamed.action = {
            ...renamed.action,
            launchMetadata: {
              ...renamed.action.launchMetadata,
              data: { ...renamed.action.launchMetadata.data, name: newLabel }
            }
          };
        }
        return renamed;
      }
      return s;
    });
    this.saveShortcuts(updated);
    return true;
  }

  /** Update the launchMetadata.data.name inside a shortcut's action to match the new label */
  updateShortcutActionName(row: number, col: number, newName: string): void {
    const current = this.shortcuts$.value;
    const updated = current.map(s => {
      if (s.gridRow === row && s.gridCol === col && s.action?.launchMetadata?.data) {
        return {
          ...s,
          action: {
            ...s.action,
            launchMetadata: {
              ...s.action.launchMetadata,
              data: { ...s.action.launchMetadata.data, name: newName }
            }
          }
        };
      }
      return s;
    });
    this.saveShortcuts(updated);
  }

  /** Convert a newFile shortcut to an openFile shortcut after the file has been saved */
  convertNewFileShortcut(originalName: string, filePath: string): void {
    const current = this.shortcuts$.value;
    const match = current.find(s =>
      s.action?.launchMetadata?.data?.type === 'newFile' &&
      (s.action.launchMetadata.data.name === originalName || s.displayLabel === originalName)
    );
    if (!match) return;
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    const updated = current.map(s => {
      if (s === match) {
        return {
          ...s,
          displayLabel: fileName,
          action: {
            ...s.action!,
            id: DesktopShortcutsService.generateActionId('org.zowe.editor', { targetPluginId: 'org.zowe.editor', type: 'openFile', name: filePath }),
            name: 'Open ' + fileName + ' in Editor',
            launchMetadata: { data: { type: 'openFile', name: filePath } }
          }
        };
      }
      return s;
    });
    this.saveShortcuts(updated);
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
    this.markShortcutOpened(shortcut);
  }

  private markShortcutOpened(shortcut: DesktopShortcut): void {
    const now = new Date().toISOString();
    const updated = this.shortcuts$.value.map(s => {
      if (s.gridRow === shortcut.gridRow && s.gridCol === shortcut.gridCol && s.pluginId === shortcut.pluginId) {
        return { ...s, lastOpenedDate: now };
      }
      return s;
    });
    this.saveShortcuts(updated);
  }

  /** Update the icon URL of a shortcut */
  updateShortcutIcon(row: number, col: number, iconUrl: string | undefined): void {
    const now = new Date().toISOString();
    const updated = this.shortcuts$.value.map(s => {
      if (s.gridRow === row && s.gridCol === col) {
        return { ...s, displayIcon: iconUrl, modifiedDate: now };
      }
      return s;
    });
    this.saveShortcuts(updated);
  }

  /** Update the launchMetadata of an action shortcut */
  updateShortcutLaunchMetadata(row: number, col: number, launchMetadata: any): void {
    const now = new Date().toISOString();
    const updated = this.shortcuts$.value.map(s => {
      if (s.gridRow === row && s.gridCol === col && s.action) {
        return { ...s, action: { ...s.action, launchMetadata }, modifiedDate: now };
      }
      return s;
    });
    this.saveShortcuts(updated);
  }

  private findNextAvailablePosition(shortcuts: DesktopShortcut[]): { row: number; col: number } {
    const topLevelShortcuts = shortcuts.filter(s => !s.folderId);
    const folders = this.folders$.value;
    const occupied = new Set([
      ...topLevelShortcuts.map(s => `${s.gridRow},${s.gridCol}`),
      ...folders.map(f => `${f.gridRow},${f.gridCol}`)
    ]);
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

  // ── Folder operations ──

  /** Get shortcuts that belong to a specific folder */
  getShortcutsInFolder(folderId: string): DesktopShortcut[] {
    return this.shortcuts$.value.filter(s => s.folderId === folderId);
  }

  /** Create a new folder at the given grid position with the provided shortcuts moved into it */
  createFolder(name: string, gridRow: number, gridCol: number, shortcutKeys: { row: number; col: number }[]): DesktopFolder {
    const now = new Date().toISOString();
    const folder: DesktopFolder = {
      id: DesktopShortcutsService.generateFolderId(),
      name,
      gridRow,
      gridCol,
      createdDate: now,
      modifiedDate: now,
      lastOpenedDate: now
    };
    const updatedFolders = [...this.folders$.value, folder];
    const updatedShortcuts = this.shortcuts$.value.map(s => {
      const match = shortcutKeys.find(k => k.row === s.gridRow && k.col === s.gridCol && !s.folderId);
      if (match) {
        return { ...s, folderId: folder.id };
      }
      return s;
    });
    this.saveAll(updatedShortcuts, updatedFolders);
    return folder;
  }

  /** Create a folder by merging two shortcuts (drag-to-create) */
  createFolderFromShortcuts(targetShortcut: DesktopShortcut, droppedShortcut: DesktopShortcut): DesktopFolder {
    return this.createFolder('New Folder', targetShortcut.gridRow, targetShortcut.gridCol, [
      { row: targetShortcut.gridRow, col: targetShortcut.gridCol },
      { row: droppedShortcut.gridRow, col: droppedShortcut.gridCol }
    ]);
  }

  /** Add an existing shortcut to a folder */
  addShortcutToFolder(folderId: string, shortcutRow: number, shortcutCol: number): void {
    const now = new Date().toISOString();
    const target = this.shortcuts$.value.find(s => s.gridRow === shortcutRow && s.gridCol === shortcutCol && !s.folderId);
    if (!target) return;
    const others = this.shortcuts$.value.filter(s => s !== target);
    const updatedShortcuts = [...others, { ...target, folderId, gridRow: -1, gridCol: -1 }];
    const updatedFolders = this.folders$.value.map(f =>
      f.id === folderId ? { ...f, modifiedDate: now } : f
    );
    this.saveAll(updatedShortcuts, updatedFolders);
  }

  /** Remove a shortcut from its folder back to the desktop grid */
  removeShortcutFromFolder(folderId: string, shortcutRow: number, shortcutCol: number): void {
    const now = new Date().toISOString();
    const position = this.findNextAvailablePosition(this.shortcuts$.value);
    const updatedShortcuts = this.shortcuts$.value.map(s => {
      if (s.gridRow === shortcutRow && s.gridCol === shortcutCol && s.folderId === folderId) {
        const { folderId: _, ...rest } = s;
        return { ...rest, gridRow: position.row, gridCol: position.col };
      }
      return s;
    });
    const remainingInFolder = updatedShortcuts.filter(s => s.folderId === folderId);
    let updatedFolders;
    if (remainingInFolder.length === 0) {
      updatedFolders = this.folders$.value.filter(f => f.id !== folderId);
    } else {
      updatedFolders = this.folders$.value.map(f =>
        f.id === folderId ? { ...f, modifiedDate: now } : f
      );
    }
    this.saveAll(updatedShortcuts, updatedFolders);
  }

  /** Remove a shortcut from its folder and place it at a specific desktop grid position */
  removeShortcutFromFolderToPosition(folderId: string, shortcutRow: number, shortcutCol: number, newRow: number, newCol: number): void {
    const now = new Date().toISOString();
    const topLevel = this.shortcuts$.value.filter(s => !s.folderId);
    const folders = this.folders$.value;
    const occupied = new Set([
      ...topLevel.map(s => `${s.gridRow},${s.gridCol}`),
      ...folders.map(f => `${f.gridRow},${f.gridCol}`)
    ]);
    let targetRow = newRow;
    let targetCol = newCol;
    if (occupied.has(`${targetRow},${targetCol}`)) {
      const pos = this.findNextAvailablePosition(this.shortcuts$.value);
      targetRow = pos.row;
      targetCol = pos.col;
    }
    const updatedShortcuts = this.shortcuts$.value.map(s => {
      if (s.gridRow === shortcutRow && s.gridCol === shortcutCol && s.folderId === folderId) {
        const { folderId: _, ...rest } = s;
        return { ...rest, gridRow: targetRow, gridCol: targetCol };
      }
      return s;
    });
    const remainingInFolder = updatedShortcuts.filter(s => s.folderId === folderId);
    let updatedFolders;
    if (remainingInFolder.length === 0) {
      updatedFolders = folders.filter(f => f.id !== folderId);
    } else {
      updatedFolders = folders.map(f =>
        f.id === folderId ? { ...f, modifiedDate: now } : f
      );
    }
    this.saveAll(updatedShortcuts, updatedFolders);
  }

  /** Reorder the shortcuts within a folder. The newOrder array contains the shortcuts in the desired order. */
  reorderShortcutsInFolder(folderId: string, newOrder: DesktopShortcut[]): void {
    const now = new Date().toISOString();
    const otherShortcuts = this.shortcuts$.value.filter(s => s.folderId !== folderId);
    const reordered = newOrder.map(s => ({ ...s, folderId }));
    const updatedShortcuts = [...otherShortcuts, ...reordered];
    const updatedFolders = this.folders$.value.map(f =>
      f.id === folderId ? { ...f, modifiedDate: now } : f
    );
    this.saveAll(updatedShortcuts, updatedFolders);
  }

  renameFolder(folderId: string, newName: string): boolean {
    const current = this.folders$.value;
    const isDuplicate = current.some(f => f.id !== folderId && f.name === newName);
    if (isDuplicate) {
      return false;
    }
    const now = new Date().toISOString();
    const updated = current.map(f =>
      f.id === folderId ? { ...f, name: newName, modifiedDate: now } : f
    );
    this.saveAll(this.shortcuts$.value, updated);
    return true;
  }

  moveFolder(folderId: string, newRow: number, newCol: number): void {
    const shortcuts = this.shortcuts$.value.filter(s => !s.folderId);
    const folders = this.folders$.value;
    const occupied = new Set([
      ...shortcuts.map(s => `${s.gridRow},${s.gridCol}`),
      ...folders.filter(f => f.id !== folderId).map(f => `${f.gridRow},${f.gridCol}`)
    ]);
    if (occupied.has(`${newRow},${newCol}`)) {
      return;
    }
    const updated = folders.map(f =>
      f.id === folderId ? { ...f, gridRow: newRow, gridCol: newCol } : f
    );
    this.saveAll(this.shortcuts$.value, updated);
  }

  /** Move multiple shortcuts and folders atomically in a single save */
  batchMoveItems(
    shortcutMoves: { pluginId: string; actionId?: string; newRow: number; newCol: number }[],
    folderMoves: { folderId: string; newRow: number; newCol: number }[]
  ): void {
    const now = new Date().toISOString();
    const shortcutMoveMap = new Map<string, { newRow: number; newCol: number }>();
    for (const m of shortcutMoves) {
      const key = m.actionId ? m.pluginId + m.actionId : m.pluginId;
      shortcutMoveMap.set(key, { newRow: m.newRow, newCol: m.newCol });
    }
    const updatedShortcuts = this.shortcuts$.value.map(s => {
      const key = s.action?.id ? s.pluginId + s.action.id : s.pluginId;
      const move = shortcutMoveMap.get(key);
      return move ? { ...s, gridRow: move.newRow, gridCol: move.newCol, modifiedDate: now } : s;
    });
    const folderMoveMap = new Map<string, { newRow: number; newCol: number }>();
    for (const m of folderMoves) {
      folderMoveMap.set(m.folderId, { newRow: m.newRow, newCol: m.newCol });
    }
    const updatedFolders = this.folders$.value.map(f => {
      const move = folderMoveMap.get(f.id);
      return move ? { ...f, gridRow: move.newRow, gridCol: move.newCol } : f;
    });
    this.saveAll(updatedShortcuts, updatedFolders);
  }

  deleteFolder(folderId: string): void {
    const updatedFolders = this.folders$.value.filter(f => f.id !== folderId);
    // Move contained shortcuts back to the desktop grid
    let updatedShortcuts = [...this.shortcuts$.value];
    const inFolder = updatedShortcuts.filter(s => s.folderId === folderId);
    for (const s of inFolder) {
      const position = this.findNextAvailablePosition(updatedShortcuts.filter(sc => !sc.folderId));
      updatedShortcuts = updatedShortcuts.map(sc => {
        if (sc === s) {
          const { folderId: _, ...rest } = sc;
          return { ...rest, gridRow: position.row, gridCol: position.col };
        }
        return sc;
      });
    }
    // Also remove from pinned and launch menu lists
    const updatedPinned = this.pinnedFolderIds$.value.filter(id => id !== folderId);
    const updatedLaunchMenu = this.launchMenuFolderIds$.value.filter(id => id !== folderId);
    this.pinnedFolderIds$.next(updatedPinned);
    this.launchMenuFolderIds$.next(updatedLaunchMenu);
    this.saveAll(updatedShortcuts, updatedFolders);
  }

  /** Update the lastOpenedDate for a folder */
  markFolderOpened(folderId: string): void {
    const now = new Date().toISOString();
    const updated = this.folders$.value.map(f =>
      f.id === folderId ? { ...f, lastOpenedDate: now } : f
    );
    this.saveAll(this.shortcuts$.value, updated);
  }

  /** Update the display icon for a folder (architecture for future UX) */
  setFolderIcon(folderId: string, iconUrl: string | undefined): void {
    const now = new Date().toISOString();
    const updated = this.folders$.value.map(f =>
      f.id === folderId ? { ...f, displayIcon: iconUrl, modifiedDate: now } : f
    );
    this.saveAll(this.shortcuts$.value, updated);
  }

  // ── Taskbar pinning for folders ──

  pinFolder(folderId: string): void {
    const current = this.pinnedFolderIds$.value;
    if (!current.includes(folderId)) {
      const updated = [...current, folderId];
      this.savePinnedFolderIds(updated);
    }
  }

  unpinFolder(folderId: string): void {
    const updated = this.pinnedFolderIds$.value.filter(id => id !== folderId);
    this.savePinnedFolderIds(updated);
  }

  isFolderPinned(folderId: string): boolean {
    return this.pinnedFolderIds$.value.includes(folderId);
  }

  // ── Launch menu pinning for folders ──

  pinToLaunchMenu(folderId: string): void {
    const current = this.launchMenuFolderIds$.value;
    if (!current.includes(folderId)) {
      const updated = [...current, folderId];
      this.saveLaunchMenuFolderIds(updated);
    }
  }

  unpinFromLaunchMenu(folderId: string): void {
    const updated = this.launchMenuFolderIds$.value.filter(id => id !== folderId);
    this.saveLaunchMenuFolderIds(updated);
  }

  isFolderInLaunchMenu(folderId: string): boolean {
    return this.launchMenuFolderIds$.value.includes(folderId);
  }

  private saveLaunchMenuFolderIds(ids: string[]): void {
    const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), this.scope, this.resourcePath, this.fileName
    );
    const params = { shortcuts: this.shortcuts$.value, folders: this.folders$.value, pinnedFolderIds: this.pinnedFolderIds$.value, launchMenuFolderIds: ids };
    this.http.put(uri, params).subscribe(
      () => { this.launchMenuFolderIds$.next(ids); },
      (err) => { this.logger.warn('Could not save launch menu folder IDs', err); }
    );
  }

  private savePinnedFolderIds(ids: string[]): void {
    const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), this.scope, this.resourcePath, this.fileName
    );
    const params = { shortcuts: this.shortcuts$.value, folders: this.folders$.value, pinnedFolderIds: ids, launchMenuFolderIds: this.launchMenuFolderIds$.value };
    this.http.put(uri, params).subscribe(
      () => { this.pinnedFolderIds$.next(ids); },
      (err) => { this.logger.warn('Could not save pinned folder IDs', err); }
    );
  }

  /** Save shortcuts directly (e.g. after reflowing out-of-bounds icons on resize) */
  saveShortcutsDirect(shortcuts: DesktopShortcut[]): void {
    this.saveAll(shortcuts, this.folders$.value);
  }

  /** Save folders directly (e.g. after reflowing out-of-bounds folders on resize) */
  saveFoldersDirect(folders: DesktopFolder[]): void {
    this.saveAll(this.shortcuts$.value, folders);
  }

  private saveAll(shortcuts: DesktopShortcut[], folders: DesktopFolder[]): void {
    const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), this.scope, this.resourcePath, this.fileName
    );
    const params = { shortcuts, folders, pinnedFolderIds: this.pinnedFolderIds$.value, launchMenuFolderIds: this.launchMenuFolderIds$.value };
    this.http.put(uri, params).subscribe(
      () => {
        this.shortcuts$.next(shortcuts);
        this.folders$.next(folders);
      },
      (err) => {
        this.logger.warn('Could not save desktop shortcuts', err);
      }
    );
  }

  /** Save only shortcuts, preserving current folders */
  private saveShortcuts(shortcuts: DesktopShortcut[]): void {
    this.saveAll(shortcuts, this.folders$.value);
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
