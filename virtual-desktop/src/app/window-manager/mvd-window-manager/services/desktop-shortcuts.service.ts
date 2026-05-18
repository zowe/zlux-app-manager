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
  /** Unique identifier for this shortcut instance */
  id: string;
  /** Plugin to launch (always required -- identifies the app for icon/label fallback) */
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
}

export interface DeletionUndoSnapshot {
  deletedShortcuts: DesktopShortcut[];
  deletedFolders: DesktopFolder[];
  removedPinnedFolderIds: string[];
  removedLaunchMenuFolderIds: string[];
  /** Shortcuts that were released from deleted folders and need to be moved back on undo */
  releasedFromFolder: { shortcutId: string; folderId: string }[];
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

  /**
   * Validate and sanitize an icon URL to prevent script injection and path traversal.
   * Returns the URL unchanged if safe, or undefined if the URL is rejected.
   * Allows: http(s) URLs, data: image URIs, and relative paths that don't traverse upward.
   */
  static sanitizeIconUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;

    // Block javascript:, vbscript:, and other dangerous schemes
    const schemeLower = trimmed.toLowerCase().replace(/[\s\x00-\x1f]/g, '');
    if (/^(javascript|vbscript|data(?!:image\/)):/i.test(schemeLower)) {
      return undefined;
    }

    // Block path traversal sequences
    if (/\.\.[\\/]/.test(trimmed) || trimmed.includes('..%2f') || trimmed.includes('..%5c')
        || trimmed.toLowerCase().includes('..%252f')) {
      return undefined;
    }

    // Block HTML/script injection characters that have no place in a URL
    if (/[<>"'`{}]/.test(trimmed)) {
      return undefined;
    }

    // Block hex-encoded control characters (\x00-\x1f) and null bytes
    if (/\\x[0-9a-fA-F]{2}/.test(trimmed) || /\x00/.test(trimmed) || /%00/.test(trimmed)) {
      return undefined;
    }

    // Block punycode in URLs (xn-- encoded domains used for homograph attacks)
    if (/xn--/i.test(trimmed)) {
      return undefined;
    }

    // Allow data:image/* URIs (e.g. data:image/png;base64,...)
    if (/^data:image\//i.test(trimmed)) {
      return trimmed;
    }

    // Allow http/https URLs and relative paths (e.g. /ZLUX/plugins/.../assets/icon.png)
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
      return trimmed;
    }

    // Reject anything else (e.g. ftp:, file:, unknown schemes)
    return undefined;
  }

  shortcuts$ = new BehaviorSubject<DesktopShortcut[]>([]);
  folders$ = new BehaviorSubject<DesktopFolder[]>([]);
  pinnedFolderIds$ = new BehaviorSubject<string[]>([]);
  launchMenuFolderIds$ = new BehaviorSubject<string[]>([]);

  /** Viewport-proportional grid limits, updated by WindowPaneComponent on resize/theme change.
   *  Used by findNextAvailablePosition() to place new shortcuts within the visible area. */
  maxGridRows: number = 20;
  maxGridCols: number = 20;

  private static readonly MAX_UNDO_DEPTH = 10;
  private deletionUndoStack: DeletionUndoSnapshot[] = [];

  /** Called by the desktop component whenever the viewport or icon size changes. */
  updateGridLimits(rows: number, cols: number): void {
    this.maxGridRows = rows;
    this.maxGridCols = cols;
  }

  private static generateFolderId(): string {
    return 'folder-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
  }

  static generateShortcutId(): string {
    return 'sc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
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

  /** Strip any displayIcon values that fail URL sanitization (defense against tampered config data) */
  private static sanitizeLoadedIcons(shortcuts: DesktopShortcut[], folders: DesktopFolder[]): void {
    for (const s of shortcuts) {
      s.displayIcon = DesktopShortcutsService.sanitizeIconUrl(s.displayIcon);
    }
    for (const f of folders) {
      f.displayIcon = DesktopShortcutsService.sanitizeIconUrl(f.displayIcon);
    }
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
          let shortcuts = (res.body.contents.shortcuts || []) as DesktopShortcut[];
          const folders = (res.body.contents.folders || []) as DesktopFolder[];
          // Backfill IDs for shortcuts migrated from pre-ID format
          let needsIdBackfill = false;
          shortcuts = shortcuts.map(s => {
            if (!s.id) {
              needsIdBackfill = true;
              return { ...s, id: DesktopShortcutsService.generateShortcutId() };
            }
            return s;
          });
          DesktopShortcutsService.sanitizeLoadedIcons(shortcuts, folders);
          this.shortcuts$.next(shortcuts);
          this.folders$.next(folders);
          this.pinnedFolderIds$.next((res.body.contents.pinnedFolderIds || []) as string[]);
          this.launchMenuFolderIds$.next((res.body.contents.launchMenuFolderIds || []) as string[]);
          if (needsIdBackfill) {
            this.saveAll(shortcuts, folders);
          }
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
   * Only updates shortcuts -- folders and pinnedFolderIds are owned by the
   * desktop and are never accepted from external writes.
   */
  reloadShortcutsExternal(): void {
    this.getResource().subscribe(
      (res: HttpResponse<any>) => {
        if (res.status === 204 || !res.body?.contents) {
          this.shortcuts$.next([]);
        } else {
          let incomingShortcuts = (res.body.contents.shortcuts || []) as DesktopShortcut[];
          // Backfill IDs for shortcuts migrated from pre-ID format
          let needsIdBackfill = false;
          incomingShortcuts = incomingShortcuts.map(s => {
            if (!s.id) {
              needsIdBackfill = true;
              return { ...s, id: DesktopShortcutsService.generateShortcutId() };
            }
            return s;
          });
          // Sanitize icon URLs from external data before accepting them
          for (const s of incomingShortcuts) {
            s.displayIcon = DesktopShortcutsService.sanitizeIconUrl(s.displayIcon);
          }
          this.shortcuts$.next(incomingShortcuts);
          // Only write back if the external app corrupted our data or IDs need backfill
          const incomingFolders = res.body.contents.folders as DesktopFolder[] | undefined;
          const incomingPinned = res.body.contents.pinnedFolderIds as string[] | undefined;
          const incomingLaunchMenu = res.body.contents.launchMenuFolderIds as string[] | undefined;
          const foldersCorrupted = !incomingFolders || JSON.stringify(incomingFolders) !== JSON.stringify(this.folders$.value);
          const pinnedCorrupted = !incomingPinned || JSON.stringify(incomingPinned) !== JSON.stringify(this.pinnedFolderIds$.value);
          const launchMenuCorrupted = !incomingLaunchMenu || JSON.stringify(incomingLaunchMenu) !== JSON.stringify(this.launchMenuFolderIds$.value);
          if (needsIdBackfill || foldersCorrupted || pinnedCorrupted || launchMenuCorrupted) {
            this.saveAll(incomingShortcuts, this.folders$.value);
          }
        }
      },
      () => {
        // Network error -- don't touch anything
      }
    );
  }

  /** Add a simple app-launch shortcut */
  addShortcut(pluginId: string): void {
    const current = this.shortcuts$.value;
    const alreadyExists = current.some(s => s.pluginId === pluginId && !s.action && !s.folderId);
    if (alreadyExists) {
      return;
    }
    const position = this.findNextAvailablePosition(current);
    const updated: DesktopShortcut[] = [...current, { id: DesktopShortcutsService.generateShortcutId(), pluginId, gridRow: position.row, gridCol: position.col }];
    this.saveShortcuts(updated);
  }

  /** Add an app-to-app action shortcut with full dispatcher action details */
  addActionShortcut(shortcut: Omit<DesktopShortcut, 'gridRow' | 'gridCol'>): void {
    const current = this.shortcuts$.value;
    const position = this.findNextAvailablePosition(current);
    const updated: DesktopShortcut[] = [...current, {
      ...shortcut,
      id: shortcut.id || DesktopShortcutsService.generateShortcutId(),
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

  removeShortcutById(shortcutId: string): void {
    const deleted = this.shortcuts$.value.find(s => s.id === shortcutId);
    if (deleted) {
      this.pushDeletionDiff([deleted], [], [], [], []);
    }
    const updated = this.shortcuts$.value.filter(s => s.id !== shortcutId);
    this.saveShortcuts(updated);
  }

  moveShortcut(shortcutId: string, newRow: number, newCol: number): void {
    const current = this.shortcuts$.value;
    const topLevel = current.filter(s => !s.folderId);
    const folders = this.folders$.value;
    const occupied = topLevel.some(s => s.id !== shortcutId && s.gridRow === newRow && s.gridCol === newCol)
      || folders.some(f => f.gridRow === newRow && f.gridCol === newCol);
    if (occupied) {
      return;
    }
    const updated = current.map(s => {
      return s.id === shortcutId ? { ...s, gridRow: newRow, gridCol: newCol } : s;
    });
    this.saveShortcuts(updated);
  }

  hasShortcut(pluginId: string): boolean {
    return this.shortcuts$.value.some(s => s.pluginId === pluginId && !s.action);
  }

  renameShortcut(shortcutId: string, newLabel: string): boolean {
    const current = this.shortcuts$.value;
    const target = current.find(s => s.id === shortcutId);
    if (!target) return false;
    // Scope duplicate check to the same container (folder or top-level desktop)
    const isDuplicate = current.some(s =>
      s.id !== shortcutId && s.displayLabel === newLabel && (s.folderId || null) === (target.folderId || null)
    );
    if (isDuplicate) {
      return false;
    }
    const updated = current.map(s => {
      if (s.id === shortcutId) {
        return { ...s, displayLabel: newLabel };
      }
      return s;
    });
    this.saveShortcuts(updated);
    return true;
  }

  /** Update the launchMetadata.data.name inside a shortcut's action to match the new label */
  updateShortcutActionName(shortcutId: string, newName: string): void {
    const current = this.shortcuts$.value;
    const updated = current.map(s => {
      if (s.id === shortcutId && s.action?.launchMetadata?.data) {
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

  /** Invoke a shortcut -- either a plain launch or a dispatcher action */
  invokeShortcut(shortcut: DesktopShortcut, applicationManager: MVDHosting.ApplicationManagerInterface, pluginDef?: any): void {
    const targetId = shortcut.action?.targetPluginId || shortcut.pluginId;
    const targetPlugin = ZoweZLUX.pluginManager.getPlugin(targetId);
    if (!targetPlugin) {
      this.logger.warn(`Cannot launch shortcut: plugin '${targetId}' is not installed`);
      ZoweZLUX.notificationManager.notify(
        ZoweZLUX.notificationManager.createNotification('Desktop Shortcut', `Cannot open shortcut: the required application '${targetId}' is not installed.`, 1, 'org.zowe.zlux.ng2desktop')
      );
      return;
    }
    if (shortcut.action) {
      const actionDef = shortcut.action;
      // For file shortcuts (openFile), spawn the editor directly with
      // the launchMetadata so the editor receives it as LAUNCH_METADATA without
      // any dispatcher primaryArgument transform that can corrupt the structure.
      const dataType = actionDef.launchMetadata?.data?.type;
      if (dataType === 'openFile') {
        const targetPluginDef = pluginDef || { basePlugin: targetPlugin, getBasePlugin: () => targetPlugin };
        applicationManager.spawnApplication(targetPluginDef as any, actionDef.launchMetadata);
      } else {
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
      }
    } else if (pluginDef) {
      applicationManager.spawnApplication(pluginDef, null);
    }
  }

  /** Update the icon URL of a shortcut */
  updateShortcutIcon(shortcutId: string, iconUrl: string | undefined): void {
    const sanitized = DesktopShortcutsService.sanitizeIconUrl(iconUrl);
    const updated = this.shortcuts$.value.map(s => {
      if (s.id === shortcutId) {
        return { ...s, displayIcon: sanitized };
      }
      return s;
    });
    this.saveShortcuts(updated);
  }

  /** Update the launchMetadata of an action shortcut */
  updateShortcutLaunchMetadata(shortcutId: string, launchMetadata: any): void {
    const updated = this.shortcuts$.value.map(s => {
      if (s.id === shortcutId && s.action) {
        return { ...s, action: { ...s.action, launchMetadata } };
      }
      return s;
    });
    this.saveShortcuts(updated);
  }

  private findNextAvailablePosition(shortcuts: DesktopShortcut[]): { row: number; col: number } {
    return this.findNextAvailablePositionFrom(shortcuts, this.folders$.value);
  }

  /** Find the next available grid position given arbitrary shortcuts and folders arrays.
   *  If the visible grid is full, expands into overflow rows beyond maxGridRows. */
  private findNextAvailablePositionFrom(shortcuts: DesktopShortcut[], folders: DesktopFolder[]): { row: number; col: number } {
    const topLevelShortcuts = shortcuts.filter(s => !s.folderId);
    const occupied = new Set([
      ...topLevelShortcuts.map(s => `${s.gridRow},${s.gridCol}`),
      ...folders.map(f => `${f.gridRow},${f.gridCol}`)
    ]);
    for (let col = 0; col < this.maxGridCols; col++) {
      for (let row = 0; row < this.maxGridRows; row++) {
        if (!occupied.has(`${row},${col}`)) {
          return { row, col };
        }
      }
    }
    // Visible grid full -- place in overflow rows
    let overflowRow = this.maxGridRows;
    while (true) {
      for (let col = 0; col < this.maxGridCols; col++) {
        if (!occupied.has(`${overflowRow},${col}`)) {
          return { row: overflowRow, col };
        }
      }
      overflowRow++;
    }
  }

  /** Returns true if every cell in the visible grid is occupied */
  isGridFull(): boolean {
    const pos = this.findNextAvailablePositionFrom(this.shortcuts$.value, this.folders$.value);
    return pos.row >= this.maxGridRows;
  }

  /** Check if a grid position is occupied in the given shortcuts and folders arrays */
  private isPositionOccupied(row: number, col: number, shortcuts: DesktopShortcut[], folders: DesktopFolder[]): boolean {
    return shortcuts.some(s => !s.folderId && s.gridRow === row && s.gridCol === col)
      || folders.some(f => f.gridRow === row && f.gridCol === col);
  }

  // -- Folder operations --

  /** Get shortcuts that belong to a specific folder */
  getShortcutsInFolder(folderId: string): DesktopShortcut[] {
    return this.shortcuts$.value.filter(s => s.folderId === folderId);
  }

  /** Generate a folder name that does not collide with any existing folder name */
  getUniqueFolderName(baseName: string): string {
    const names = new Set(this.folders$.value.map(f => f.name));
    if (!names.has(baseName)) return baseName;
    let i = 2;
    while (names.has(`${baseName} (${i})`)) i++;
    return `${baseName} (${i})`;
  }

  /** Create a new folder at the given grid position with the provided shortcuts moved into it */
  createFolder(name: string, gridRow: number, gridCol: number, shortcutIds: string[]): DesktopFolder {
    const folder: DesktopFolder = {
      id: DesktopShortcutsService.generateFolderId(),
      name,
      gridRow,
      gridCol
    };
    const updatedFolders = [...this.folders$.value, folder];
    const shortcutIdSet = new Set(shortcutIds);
    const updatedShortcuts = this.shortcuts$.value.map(s => {
      if (shortcutIdSet.has(s.id) && !s.folderId) {
        return { ...s, folderId: folder.id };
      }
      return s;
    });
    this.saveAll(updatedShortcuts, updatedFolders);
    return folder;
  }

  /** Create a folder by merging two shortcuts (drag-to-create) */
  createFolderFromShortcuts(targetShortcut: DesktopShortcut, droppedShortcut: DesktopShortcut): DesktopFolder {
    return this.createFolder(this.getUniqueFolderName('New Folder'), targetShortcut.gridRow, targetShortcut.gridCol, [
      targetShortcut.id,
      droppedShortcut.id
    ]);
  }

  /** Add an existing shortcut to a folder */
  addShortcutToFolder(folderId: string, shortcutId: string): void {
    const target = this.shortcuts$.value.find(s => s.id === shortcutId && !s.folderId);
    if (!target) return;
    const others = this.shortcuts$.value.filter(s => s !== target);
    const updatedShortcuts = [...others, { ...target, folderId, gridRow: -1, gridCol: -1 }];
    this.saveAll(updatedShortcuts, this.folders$.value);
  }

  /** Add multiple existing shortcuts to a folder atomically in a single save */
  batchAddShortcutsToFolder(folderId: string, shortcutIds: string[]): void {
    const idSet = new Set(shortcutIds);
    const updatedShortcuts = this.shortcuts$.value.map(s => {
      if (idSet.has(s.id) && !s.folderId) {
        return { ...s, folderId, gridRow: -1, gridCol: -1 };
      }
      return s;
    });
    this.saveAll(updatedShortcuts, this.folders$.value);
  }

  /** Create a new shortcut and place it directly into a folder in a single save */
  addShortcutDirectlyToFolder(pluginId: string, folderId: string): void {
    const current = this.shortcuts$.value;
    // Prevent duplicate apps in the same folder
    if (current.some(s => s.pluginId === pluginId && s.folderId === folderId)) {
      ZoweZLUX.notificationManager.notify(
        ZoweZLUX.notificationManager.createNotification(
          'Desktop Shortcuts',
          'This application is already in the selected folder.',
          1,
          'org.zowe.zlux.ng2desktop'
        )
      );
      return;
    }
    const newShortcut: DesktopShortcut = {
      id: DesktopShortcutsService.generateShortcutId(),
      pluginId,
      gridRow: -1,
      gridCol: -1,
      folderId
    };
    const updatedShortcuts = [...current, newShortcut];
    this.saveAll(updatedShortcuts, this.folders$.value);
  }

  /** Remove a shortcut from its folder back to the desktop grid */
  removeShortcutFromFolder(folderId: string, shortcutId: string): void {
    const position = this.findNextAvailablePosition(this.shortcuts$.value);
    const updatedShortcuts = this.shortcuts$.value.map(s => {
      if (s.id === shortcutId && s.folderId === folderId) {
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
      updatedFolders = this.folders$.value;
    }
    this.saveAll(updatedShortcuts, updatedFolders);
  }

  /** Remove a shortcut from its folder and place it at a specific desktop grid position */
  removeShortcutFromFolderToPosition(folderId: string, shortcutId: string, newRow: number, newCol: number): void {
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
      if (s.id === shortcutId && s.folderId === folderId) {
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
      updatedFolders = folders;
    }
    this.saveAll(updatedShortcuts, updatedFolders);
  }

  /** Reorder the shortcuts within a folder. The newOrder array contains the shortcuts in the desired order. */
  reorderShortcutsInFolder(folderId: string, newOrder: DesktopShortcut[]): void {
    const otherShortcuts = this.shortcuts$.value.filter(s => s.folderId !== folderId);
    const reordered = newOrder.map(s => ({ ...s, folderId }));
    const updatedShortcuts = [...otherShortcuts, ...reordered];
    this.saveAll(updatedShortcuts, this.folders$.value);
  }

  renameFolder(folderId: string, newName: string): boolean {
    const current = this.folders$.value;
    const isDuplicate = current.some(f => f.id !== folderId && f.name === newName);
    if (isDuplicate) {
      return false;
    }
    const updated = current.map(f =>
      f.id === folderId ? { ...f, name: newName } : f
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
    shortcutMoves: { shortcutId: string; newRow: number; newCol: number }[],
    folderMoves: { folderId: string; newRow: number; newCol: number }[]
  ): void {
    const shortcutMoveMap = new Map<string, { newRow: number; newCol: number }>();
    for (const m of shortcutMoves) {
      shortcutMoveMap.set(m.shortcutId, { newRow: m.newRow, newCol: m.newCol });
    }
    const updatedShortcuts = this.shortcuts$.value.map(s => {
      const move = shortcutMoveMap.get(s.id);
      return move ? { ...s, gridRow: move.newRow, gridCol: move.newCol } : s;
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

  /** Move all shortcuts belonging to a folder back to the top-level desktop grid.
   *  Each orphaned shortcut is assigned the nearest available position.
   *  Returns a new shortcuts array with the folderId cleared and positions assigned. */
  private releaseShortcutsFromFolder(shortcuts: DesktopShortcut[], folderId: string): DesktopShortcut[] {
    let updated = shortcuts;
    const inFolder = updated.filter(s => s.folderId === folderId);
    for (const s of inFolder) {
      const position = this.findNextAvailablePosition(updated.filter(sc => !sc.folderId));
      updated = updated.map(sc => {
        if (sc === s) {
          const { folderId: _, ...rest } = sc;
          return { ...rest, gridRow: position.row, gridCol: position.col };
        }
        return sc;
      });
    }
    return updated;
  }

  /** Delete multiple shortcuts and folders atomically in a single save */
  batchDeleteItems(shortcutIds: string[], folderIds: string[]): void {
    const shortcutIdSet = new Set(shortcutIds);
    const folderIdSet = new Set(folderIds);

    const deletedShortcuts = this.shortcuts$.value.filter(s => shortcutIdSet.has(s.id));
    const deletedFolders = this.folders$.value.filter(f => folderIdSet.has(f.id));
    const removedPinned = this.pinnedFolderIds$.value.filter(id => folderIdSet.has(id));
    const removedLaunchMenu = this.launchMenuFolderIds$.value.filter(id => folderIdSet.has(id));
    const releasedFromFolder: { shortcutId: string; folderId: string }[] = [];
    for (const folderId of folderIds) {
      for (const s of this.shortcuts$.value.filter(s => s.folderId === folderId)) {
        releasedFromFolder.push({ shortcutId: s.id, folderId });
      }
    }
    this.pushDeletionDiff(deletedShortcuts, deletedFolders, removedPinned, removedLaunchMenu, releasedFromFolder);

    // Remove the targeted shortcuts
    let updatedShortcuts = this.shortcuts$.value.filter(s => !shortcutIdSet.has(s.id));

    // For each deleted folder, move its contained shortcuts back to the desktop grid
    let updatedFolders = this.folders$.value.filter(f => !folderIdSet.has(f.id));
    for (const folderId of folderIds) {
      updatedShortcuts = this.releaseShortcutsFromFolder(updatedShortcuts, folderId);
    }

    // Also remove from pinned and launch menu lists
    const updatedPinned = this.pinnedFolderIds$.value.filter(id => !folderIdSet.has(id));
    const updatedLaunchMenu = this.launchMenuFolderIds$.value.filter(id => !folderIdSet.has(id));
    this.pinnedFolderIds$.next(updatedPinned);
    this.launchMenuFolderIds$.next(updatedLaunchMenu);

    this.saveAll(updatedShortcuts, updatedFolders);
  }

  deleteFolder(folderId: string): void {
    const deletedFolder = this.folders$.value.find(f => f.id === folderId);
    const removedPinned = this.pinnedFolderIds$.value.filter(id => id === folderId);
    const removedLaunchMenu = this.launchMenuFolderIds$.value.filter(id => id === folderId);
    const releasedFromFolder = this.shortcuts$.value
      .filter(s => s.folderId === folderId)
      .map(s => ({ shortcutId: s.id, folderId }));
    this.pushDeletionDiff([], deletedFolder ? [deletedFolder] : [], removedPinned, removedLaunchMenu, releasedFromFolder);

    const updatedFolders = this.folders$.value.filter(f => f.id !== folderId);
    const updatedShortcuts = this.releaseShortcutsFromFolder([...this.shortcuts$.value], folderId);
    // Also remove from pinned and launch menu lists
    const updatedPinned = this.pinnedFolderIds$.value.filter(id => id !== folderId);
    const updatedLaunchMenu = this.launchMenuFolderIds$.value.filter(id => id !== folderId);
    this.pinnedFolderIds$.next(updatedPinned);
    this.launchMenuFolderIds$.next(updatedLaunchMenu);
    this.saveAll(updatedShortcuts, updatedFolders);
  }

  /** Update the display icon for a folder (architecture for future UX) */
  setFolderIcon(folderId: string, iconUrl: string | undefined): void {
    const sanitized = DesktopShortcutsService.sanitizeIconUrl(iconUrl);
    const updated = this.folders$.value.map(f =>
      f.id === folderId ? { ...f, displayIcon: sanitized } : f
    );
    this.saveAll(this.shortcuts$.value, updated);
  }

  // -- Taskbar pinning for folders --

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

  // -- Launch menu pinning for folders --

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
      (err) => {
        this.logger.warn('Could not save launch menu folder IDs', err);
        this.notifySaveError(err);
      }
    );
  }

  private savePinnedFolderIds(ids: string[]): void {
    const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), this.scope, this.resourcePath, this.fileName
    );
    const params = { shortcuts: this.shortcuts$.value, folders: this.folders$.value, pinnedFolderIds: ids, launchMenuFolderIds: this.launchMenuFolderIds$.value };
    this.http.put(uri, params).subscribe(
      () => { this.pinnedFolderIds$.next(ids); },
      (err) => {
        this.logger.warn('Could not save pinned folder IDs', err);
        this.notifySaveError(err);
      }
    );
  }

  saveAll(shortcuts: DesktopShortcut[], folders: DesktopFolder[]): void {
    // Update local state immediately so subsequent reads always see the newest data.
    // Without this, competing HTTP PUTs read stale snapshots and the last response
    // to arrive wins.
    this.shortcuts$.next(shortcuts);
    this.folders$.next(folders);

    const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), this.scope, this.resourcePath, this.fileName
    );
    const params = { shortcuts, folders, pinnedFolderIds: this.pinnedFolderIds$.value, launchMenuFolderIds: this.launchMenuFolderIds$.value };
    this.http.put(uri, params).subscribe(
      () => { /* state already applied optimistically above */ },
      (err) => {
        this.logger.warn('Could not save desktop shortcuts', err);
        this.notifySaveError(err);
      }
    );
  }

  /** Save only shortcuts, preserving current folders */
  private saveShortcuts(shortcuts: DesktopShortcut[]): void {
    this.saveAll(shortcuts, this.folders$.value);
  }

  private pushDeletionDiff(
    deletedShortcuts: DesktopShortcut[],
    deletedFolders: DesktopFolder[],
    removedPinnedFolderIds: string[],
    removedLaunchMenuFolderIds: string[],
    releasedFromFolder: { shortcutId: string; folderId: string }[]
  ): void {
    this.deletionUndoStack.push({
      deletedShortcuts: JSON.parse(JSON.stringify(deletedShortcuts)),
      deletedFolders: JSON.parse(JSON.stringify(deletedFolders)),
      removedPinnedFolderIds: [...removedPinnedFolderIds],
      removedLaunchMenuFolderIds: [...removedLaunchMenuFolderIds],
      releasedFromFolder: [...releasedFromFolder]
    });
    if (this.deletionUndoStack.length > DesktopShortcutsService.MAX_UNDO_DEPTH) {
      this.deletionUndoStack.shift();
    }
  }

  get canUndoDelete(): boolean {
    return this.deletionUndoStack.length > 0;
  }

  undoLastDelete(): boolean {
    const snapshot = this.deletionUndoStack.pop();
    if (!snapshot) return false;

    let currentShortcuts = [...this.shortcuts$.value];
    let currentFolders = [...this.folders$.value];

    // Re-add deleted folders first (so positions are resolved before shortcuts)
    for (const folder of snapshot.deletedFolders) {
      if (currentFolders.some(f => f.id === folder.id)) continue;
      if (this.isPositionOccupied(folder.gridRow, folder.gridCol, currentShortcuts, currentFolders)) {
        const pos = this.findNextAvailablePositionFrom(currentShortcuts, currentFolders);
        currentFolders = [...currentFolders, { ...folder, gridRow: pos.row, gridCol: pos.col }];
      } else {
        currentFolders = [...currentFolders, folder];
      }
    }

    // Re-add deleted shortcuts
    for (const shortcut of snapshot.deletedShortcuts) {
      if (currentShortcuts.some(s => s.id === shortcut.id)) continue;
      // Skip if a shortcut for the same plugin already exists in the same container
      if (!shortcut.action && currentShortcuts.some(s =>
        s.pluginId === shortcut.pluginId && !s.action && (s.folderId || null) === (shortcut.folderId || null)
      )) continue;
      if (shortcut.folderId) {
        // Was inside a folder -- add back as-is
        currentShortcuts = [...currentShortcuts, shortcut];
      } else if (this.isPositionOccupied(shortcut.gridRow, shortcut.gridCol, currentShortcuts, currentFolders)) {
        const pos = this.findNextAvailablePositionFrom(currentShortcuts, currentFolders);
        currentShortcuts = [...currentShortcuts, { ...shortcut, gridRow: pos.row, gridCol: pos.col }];
      } else {
        currentShortcuts = [...currentShortcuts, shortcut];
      }
    }

    // Move released shortcuts back into their restored folders
    if (snapshot.releasedFromFolder.length > 0) {
      const releaseMap = new Map<string, string>();
      for (const entry of snapshot.releasedFromFolder) {
        releaseMap.set(entry.shortcutId, entry.folderId);
      }
      currentShortcuts = currentShortcuts.map(s => {
        const originalFolderId = releaseMap.get(s.id);
        if (originalFolderId && currentFolders.some(f => f.id === originalFolderId)) {
          return { ...s, folderId: originalFolderId, gridRow: -1, gridCol: -1 };
        }
        return s;
      });
    }

    // Re-add removed pinned folder IDs
    const updatedPinned = [...this.pinnedFolderIds$.value];
    for (const id of snapshot.removedPinnedFolderIds) {
      if (!updatedPinned.includes(id)) updatedPinned.push(id);
    }
    this.pinnedFolderIds$.next(updatedPinned);

    // Re-add removed launch menu folder IDs
    const updatedLaunchMenu = [...this.launchMenuFolderIds$.value];
    for (const id of snapshot.removedLaunchMenuFolderIds) {
      if (!updatedLaunchMenu.includes(id)) updatedLaunchMenu.push(id);
    }
    this.launchMenuFolderIds$.next(updatedLaunchMenu);

    this.saveAll(currentShortcuts, currentFolders);
    return true;
  }

  /** Notify the user via Zowe notification center when a save operation fails */
  private notifySaveError(err: any): void {
    const status = err?.status ? ` (${err.status})` : '';
    ZoweZLUX.notificationManager.notify(
      ZoweZLUX.notificationManager.createNotification(
        'Desktop Shortcuts',
        `Your desktop changes could not be saved${status}. They will be lost on next login.`,
        1,
        'org.zowe.zlux.ng2desktop'
      )
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
