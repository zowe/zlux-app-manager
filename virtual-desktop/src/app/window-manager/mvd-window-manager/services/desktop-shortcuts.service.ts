/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, Subscription, forkJoin, of } from 'rxjs';
import { take, catchError } from 'rxjs/operators';
import { BaseLogger } from 'virtual-desktop-logger';
import { UssFileService } from './uss-file.service';
import { UssStorageBackend, DesktopRealFile } from './uss-storage-backend.service';
import { DesktopShortcut, DesktopFolder, sanitizeIconUrl, generateShortcutId, generateFolderId } from './desktop-shortcuts.types';

export { DesktopShortcutAction, DesktopShortcut, DesktopFolder } from './desktop-shortcuts.types';
export { DesktopRealFile } from './uss-storage-backend.service';

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

  /** Whether file-backed storage is active (vs config dataservice) */
  private fileBackedMode = false;

  /** USS storage backend -- only used when fileBackedMode is true */
  private ussBackend: UssStorageBackend | null = null;

  /** USS file service -- injected, used to create the backend */
  private ussFileService: UssFileService | null = null;

  /** Subscription to external change events from polling */
  private externalChangeSub: Subscription | null = null;

  /** Real USS files on the desktop (only populated in file-backed mode) */
  realFiles$ = new BehaviorSubject<DesktopRealFile[]>([]);

  /** Whether trash has entries (for context menu visibility) */
  trashHasEntries$ = new BehaviorSubject<boolean>(false);

  /** File associations from .desktop-settings.json */
  fileAssociations$ = new BehaviorSubject<{ [ext: string]: string }>({});

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
    return sanitizeIconUrl(url);
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
    return generateFolderId();
  }

  static generateShortcutId(): string {
    return generateShortcutId();
  }

  constructor(
    private injector: Injector,
    private http: HttpClient,
    ussFileService: UssFileService
  ) {
    this.ussFileService = ussFileService;
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.authenticationManager.registerPreLogoutAction(this);
  }

  onLogout(username: string): boolean {
    this.shortcuts$.next([]);
    this.folders$.next([]);
    this.pinnedFolderIds$.next([]);
    this.launchMenuFolderIds$.next([]);
    this.realFiles$.next([]);
    this.trashHasEntries$.next(false);
    this.fileAssociations$.next({});
    if (this.ussBackend) {
      this.ussBackend.destroy();
      this.ussBackend = null;
    }
    if (this.externalChangeSub) {
      this.externalChangeSub.unsubscribe();
      this.externalChangeSub = null;
    }
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
    // Check feature flag and initialize file-backed mode if enabled
    this.fetchShortcutsConfig().then((config) => {
      if (config.fileBackedShortcuts) {
        this.initFileBackedMode(config);
      } else {
        this.loadFromConfigDataservice();
      }
    }).catch(() => {
      this.loadFromConfigDataservice();
    });
  }

  /** Fetch shortcuts configuration from the dedicated server endpoint */
  private fetchShortcutsConfig(): Promise<{
    fileBackedShortcuts: boolean;
    shortcutsPollInterval: number;
    shortcutsDirectory: string | null;
    systemShortcutsDirectory: string | null;
  }> {
    return new Promise((resolve, reject) => {
      const uriPrefix = window.location.pathname.split('ZLUX/plugins/')[0];
      this.http.get<any>(`${uriPrefix}server/shortcuts-config`).subscribe(
        (res) => resolve({
          fileBackedShortcuts: res.fileBackedShortcuts ?? false,
          shortcutsPollInterval: res.shortcutsPollInterval ?? 30000,
          shortcutsDirectory: res.shortcutsDirectory ?? null,
          systemShortcutsDirectory: res.systemShortcutsDirectory ?? null
        }),
        (err) => reject(err)
      );
    });
  }

  /** Initialize file-backed mode: resolve home dir, create backend, load or migrate */
  private initFileBackedMode(config: {
    shortcutsDirectory: string | null;
    systemShortcutsDirectory: string | null;
    shortcutsPollInterval: number;
  }): void {
    const shortcutsDir = config.shortcutsDirectory;
    const systemDir = config.systemShortcutsDirectory;
    const pollInterval = config.shortcutsPollInterval;

    this.fileBackedMode = true;
    this.ussBackend = new UssStorageBackend(this.ussFileService!);

    // Resolve the shortcuts root directory
    this.ussFileService!.resolveShortcutsRoot(shortcutsDir);
    this.ussFileService!.ready$.pipe(take(1)).subscribe(
      (rootPath: string) => {
        // Try to load existing file-backed data
        this.ussBackend!.init(rootPath, systemDir, pollInterval).subscribe(
          (state) => {
            if (state.shortcuts.length === 0 && state.folders.length === 0 && state.realFiles.length === 0) {
              // Empty directory -- attempt migration from config dataservice
              this.loadFromConfigDataserviceForMigration(rootPath, systemDir, pollInterval);
            } else {
              this.applyFileBackedState(state);
            }
          },
          (err) => {
            this.logger.warn('Failed to load file-backed shortcuts: ' + (err.message || err));
            this.loadFromConfigDataservice();
          }
        );
      },
      (err: any) => {
        this.logger.warn('Failed to resolve shortcuts root: ' + (err.message || err));
        this.fileBackedMode = false;
        this.ussBackend = null;
        this.loadFromConfigDataservice();
      }
    );
  }

  /** Load from config dataservice, then migrate to file-backed storage */
  private loadFromConfigDataserviceForMigration(rootPath: string, systemDir: string | null, pollInterval: number): void {
    this.getResource().subscribe(
      (res: HttpResponse<any>) => {
        if (res.status === 204 || !res.body?.contents) {
          // No existing config data either -- just load empty state from USS
          this.ussBackend!.init(rootPath, systemDir, pollInterval).subscribe(
            (state) => this.applyFileBackedState(state),
            () => this.setEmptyState()
          );
          return;
        }
        let shortcuts = (res.body.contents.shortcuts || []) as DesktopShortcut[];
        const folders = (res.body.contents.folders || []) as DesktopFolder[];
        shortcuts = shortcuts.map(s => s.id ? s : { ...s, id: DesktopShortcutsService.generateShortcutId() });
        DesktopShortcutsService.sanitizeLoadedIcons(shortcuts, folders);
        const pinnedFolderIds = (res.body.contents.pinnedFolderIds || []) as string[];
        const launchMenuFolderIds = (res.body.contents.launchMenuFolderIds || []) as string[];

        // Migrate to USS
        this.ussBackend!.migrate(shortcuts, folders, pinnedFolderIds, launchMenuFolderIds).subscribe(
          (migrated) => {
            if (migrated) {
              this.logger.info('Migration from config dataservice completed -- reloading from USS');
            }
            // Reload from USS to get the canonical state
            this.ussBackend!.loadAll().subscribe(
              (state) => this.applyFileBackedState(state),
              () => {
                // Fallback: use the migrated data directly
                this.shortcuts$.next(shortcuts);
                this.folders$.next(folders);
                this.pinnedFolderIds$.next(pinnedFolderIds);
                this.launchMenuFolderIds$.next(launchMenuFolderIds);
              }
            );
          },
          () => {
            this.logger.warn('Migration failed -- using config dataservice data');
            this.shortcuts$.next(shortcuts);
            this.folders$.next(folders);
            this.pinnedFolderIds$.next(pinnedFolderIds);
            this.launchMenuFolderIds$.next(launchMenuFolderIds);
          }
        );
      },
      () => {
        this.setEmptyState();
      }
    );
  }

  /** Apply state loaded from the USS backend to the BehaviorSubjects */
  private applyFileBackedState(state: {
    shortcuts: DesktopShortcut[];
    folders: DesktopFolder[];
    pinnedFolderIds: string[];
    launchMenuFolderIds: string[];
    realFiles: DesktopRealFile[];
  }): void {
    // Auto-place any items without a grid position
    this.autoPlaceItems(state.shortcuts, state.folders, state.realFiles);

    DesktopShortcutsService.sanitizeLoadedIcons(state.shortcuts, state.folders);
    this.shortcuts$.next(state.shortcuts);
    this.folders$.next(state.folders);
    this.pinnedFolderIds$.next(state.pinnedFolderIds);
    this.launchMenuFolderIds$.next(state.launchMenuFolderIds);
    this.realFiles$.next(state.realFiles);
    this.fileAssociations$.next(this.ussBackend?.getSettings()?.fileAssociations || {});

    // Check trash state
    if (this.ussBackend) {
      this.trashHasEntries$.next(this.ussBackend.hasTrashEntries());
    }

    // Subscribe to external changes from polling
    if (this.ussBackend && !this.externalChangeSub) {
      this.externalChangeSub = this.ussBackend.externalChange$.subscribe(() => {
        this.reloadFromUss();
      });
    }
  }

  /** Auto-place items that don't have a grid position (-1, -1) */
  private autoPlaceItems(shortcuts: DesktopShortcut[], folders: DesktopFolder[], realFiles: DesktopRealFile[]): void {
    // Place folders first
    for (const folder of folders) {
      if (folder.gridRow < 0 || folder.gridCol < 0) {
        const pos = this.findNextAvailablePositionFrom(shortcuts, folders);
        folder.gridRow = pos.row;
        folder.gridCol = pos.col;
      }
    }
    // Place top-level shortcuts
    for (const shortcut of shortcuts) {
      if (!shortcut.folderId && (shortcut.gridRow < 0 || shortcut.gridCol < 0)) {
        const pos = this.findNextAvailablePositionFrom(shortcuts, folders);
        shortcut.gridRow = pos.row;
        shortcut.gridCol = pos.col;
      }
    }
    // Place real files
    for (const rf of realFiles) {
      if (rf.gridRow < 0 || rf.gridCol < 0) {
        const pos = this.findNextAvailablePositionFrom(shortcuts, folders);
        rf.gridRow = pos.row;
        rf.gridCol = pos.col;
      }
    }
  }

  /** Reload all state from USS (triggered by polling external changes) */
  private reloadFromUss(): void {
    if (!this.ussBackend) return;
    this.ussBackend.loadAll().subscribe(
      (state) => this.applyFileBackedState(state),
      (err) => this.logger.warn('Failed to reload from USS: ' + (err.message || err))
    );
  }

  /** Trigger a manual refresh (for "Refresh Desktop" context menu action) */
  refreshDesktop(): void {
    if (this.fileBackedMode && this.ussBackend) {
      this.ussBackend.poll();
    }
  }

  /** Original config dataservice load path */
  private loadFromConfigDataservice(): void {
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
    if (this.fileBackedMode) {
      this.reloadFromUss();
      return;
    }
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
    this.shortcuts$.next(updated);

    if (this.fileBackedMode && this.ussBackend) {
      // Move shortcut file to .zweTrash/
      this.ussBackend.moveShortcutToTrash(shortcutId).subscribe(
        () => {
          this.trashHasEntries$.next(true);
          this.ussBackend!.removePosition(shortcutId);
          this.ussBackend!.updatePositions([]).subscribe();
        },
        (err) => this.logger.warn('Failed to move shortcut to trash: ' + err)
      );
    } else {
      this.saveShortcuts(updated);
    }
  }

  moveShortcut(shortcutId: string, newRow: number, newCol: number): void {
    const current = this.shortcuts$.value;
    const topLevel = current.filter(s => !s.folderId);
    const folders = this.folders$.value;
    const occupied = topLevel.some(s => s.id !== shortcutId && s.gridRow === newRow && s.gridCol === newCol)
      || folders.some(f => f.gridRow === newRow && f.gridCol === newCol)
      || this.realFiles$.value.some(rf => rf.gridRow === newRow && rf.gridCol === newCol);
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
      ...folders.map(f => `${f.gridRow},${f.gridCol}`),
      ...this.realFiles$.value.map(rf => `${rf.gridRow},${rf.gridCol}`)
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
      || folders.some(f => f.gridRow === row && f.gridCol === col)
      || this.realFiles$.value.some(rf => rf.gridRow === row && rf.gridCol === col);
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

    // In file-backed mode, also create the USS directory
    if (this.fileBackedMode && this.ussBackend) {
      this.ussBackend.createFolderDir(name).subscribe(
        () => this.saveAll(updatedShortcuts, updatedFolders),
        (err) => {
          this.logger.warn('Failed to create folder directory: ' + err);
          this.notifySaveError(err);
        }
      );
    } else {
      this.saveAll(updatedShortcuts, updatedFolders);
    }
    return folder;
  }

  /** Create a folder by merging two shortcuts (drag-to-create) */
  createFolderFromShortcuts(targetShortcut: DesktopShortcut, droppedShortcut: DesktopShortcut): DesktopFolder {
    // If both shortcuts share the same pluginId, only include the target
    const ids = targetShortcut.pluginId === droppedShortcut.pluginId
      ? [targetShortcut.id]
      : [targetShortcut.id, droppedShortcut.id];
    return this.createFolder(this.getUniqueFolderName('New Folder'), targetShortcut.gridRow, targetShortcut.gridCol, ids);
  }

  /** Add an existing shortcut to a folder */
  addShortcutToFolder(folderId: string, shortcutId: string): void {
    const target = this.shortcuts$.value.find(s => s.id === shortcutId && !s.folderId);
    if (!target) return;
    // Prevent duplicate pluginId in the same folder
    if (this.shortcuts$.value.some(s => s.id !== shortcutId && s.pluginId === target.pluginId && s.folderId === folderId)) {
      return;
    }
    const others = this.shortcuts$.value.filter(s => s !== target);
    const updatedShortcuts = [...others, { ...target, folderId, gridRow: -1, gridCol: -1 }];
    this.saveAll(updatedShortcuts, this.folders$.value);
  }

  /** Add multiple existing shortcuts to a folder atomically in a single save */
  batchAddShortcutsToFolder(folderId: string, shortcutIds: string[]): void {
    const idSet = new Set(shortcutIds);
    // Collect pluginIds already in the target folder to prevent duplicates
    const existingPluginIds = new Set(
      this.shortcuts$.value.filter(s => s.folderId === folderId).map(s => s.pluginId)
    );
    const updatedShortcuts = this.shortcuts$.value.map(s => {
      if (idSet.has(s.id) && !s.folderId) {
        if (existingPluginIds.has(s.pluginId)) {
          return s;
        }
        existingPluginIds.add(s.pluginId);
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
      ...folders.map(f => `${f.gridRow},${f.gridCol}`),
      ...this.realFiles$.value.map(rf => `${rf.gridRow},${rf.gridCol}`)
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
    const oldFolder = current.find(f => f.id === folderId);
    const updated = current.map(f =>
      f.id === folderId ? { ...f, name: newName } : f
    );

    // In file-backed mode, also rename the USS directory
    if (this.fileBackedMode && this.ussBackend && oldFolder) {
      this.ussBackend.renameFolderDir(oldFolder.name, newName).subscribe(
        () => this.saveAll(this.shortcuts$.value, updated),
        (err) => {
          this.logger.warn('Failed to rename folder directory: ' + err);
          this.notifySaveError(err);
        }
      );
    } else {
      this.saveAll(this.shortcuts$.value, updated);
    }
    return true;
  }

  moveFolder(folderId: string, newRow: number, newCol: number): void {
    const shortcuts = this.shortcuts$.value.filter(s => !s.folderId);
    const folders = this.folders$.value;
    const occupied = new Set([
      ...shortcuts.map(s => `${s.gridRow},${s.gridCol}`),
      ...folders.filter(f => f.id !== folderId).map(f => `${f.gridRow},${f.gridCol}`),
      ...this.realFiles$.value.map(rf => `${rf.gridRow},${rf.gridCol}`)
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

    // In file-backed mode, move items to trash before saving state
    if (this.fileBackedMode && this.ussBackend) {
      const trashOps: Observable<any>[] = [];
      for (const s of deletedShortcuts) {
        trashOps.push(this.ussBackend.moveShortcutToTrash(s.id).pipe(catchError(() => of(''))));
      }
      for (const f of deletedFolders) {
        trashOps.push(this.ussBackend.moveFolderToTrash(f.name).pipe(catchError(() => of(''))));
      }
      if (trashOps.length > 0) {
        forkJoin(trashOps).subscribe(
          () => {
            this.trashHasEntries$.next(true);
            this.saveAll(updatedShortcuts, updatedFolders);
          },
          () => this.saveAll(updatedShortcuts, updatedFolders)
        );
      } else {
        this.saveAll(updatedShortcuts, updatedFolders);
      }
    } else {
      this.saveAll(updatedShortcuts, updatedFolders);
    }
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
    const updatedPinned = this.pinnedFolderIds$.value.filter(id => id !== folderId);
    const updatedLaunchMenu = this.launchMenuFolderIds$.value.filter(id => id !== folderId);
    this.pinnedFolderIds$.next(updatedPinned);
    this.launchMenuFolderIds$.next(updatedLaunchMenu);

    // In file-backed mode, move the folder directory to trash
    if (this.fileBackedMode && this.ussBackend && deletedFolder) {
      this.ussBackend.moveFolderToTrash(deletedFolder.name).subscribe(
        () => {
          this.trashHasEntries$.next(true);
          this.saveAll(updatedShortcuts, updatedFolders);
        },
        (err: any) => {
          this.logger.warn('Failed to move folder to trash: ' + err);
          this.saveAll(updatedShortcuts, updatedFolders);
        }
      );
    } else {
      this.saveAll(updatedShortcuts, updatedFolders);
    }
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
    this.launchMenuFolderIds$.next(ids);
    if (this.fileBackedMode && this.ussBackend) {
      this.ussBackend.updateSettings({ launchMenuFolderIds: ids }).subscribe(
        () => {},
        (err) => {
          this.logger.warn('Could not save launch menu folder IDs', err);
          this.notifySaveError(err);
        }
      );
      return;
    }
    const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), this.scope, this.resourcePath, this.fileName
    );
    const params = { shortcuts: this.shortcuts$.value, folders: this.folders$.value, pinnedFolderIds: this.pinnedFolderIds$.value, launchMenuFolderIds: ids };
    this.http.put(uri, params).subscribe(
      () => {},
      (err) => {
        this.logger.warn('Could not save launch menu folder IDs', err);
        this.notifySaveError(err);
      }
    );
  }

  private savePinnedFolderIds(ids: string[]): void {
    this.pinnedFolderIds$.next(ids);
    if (this.fileBackedMode && this.ussBackend) {
      this.ussBackend.updateSettings({ pinnedFolderIds: ids }).subscribe(
        () => {},
        (err) => {
          this.logger.warn('Could not save pinned folder IDs', err);
          this.notifySaveError(err);
        }
      );
      return;
    }
    const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), this.scope, this.resourcePath, this.fileName
    );
    const params = { shortcuts: this.shortcuts$.value, folders: this.folders$.value, pinnedFolderIds: ids, launchMenuFolderIds: this.launchMenuFolderIds$.value };
    this.http.put(uri, params).subscribe(
      () => {},
      (err) => {
        this.logger.warn('Could not save pinned folder IDs', err);
        this.notifySaveError(err);
      }
    );
  }

  saveAll(shortcuts: DesktopShortcut[], folders: DesktopFolder[]): void {
    // Update local state immediately (optimistic update)
    this.shortcuts$.next(shortcuts);
    this.folders$.next(folders);

    if (this.fileBackedMode && this.ussBackend) {
      this.saveAllToUss(shortcuts, folders);
      return;
    }

    const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), this.scope, this.resourcePath, this.fileName
    );
    const params = { shortcuts, folders, pinnedFolderIds: this.pinnedFolderIds$.value, launchMenuFolderIds: this.launchMenuFolderIds$.value };
    this.http.put(uri, params).subscribe(
      () => {},
      (err) => {
        this.logger.warn('Could not save desktop shortcuts', err);
        this.notifySaveError(err);
      }
    );
  }

  /** Persist all state to USS files */
  private saveAllToUss(shortcuts: DesktopShortcut[], folders: DesktopFolder[]): void {
    if (!this.ussBackend) return;

    // Write each shortcut to .zweStore/
    const writeOps: Observable<void>[] = [];
    for (const s of shortcuts) {
      writeOps.push(this.ussBackend.writeShortcut(s));
    }

    // Build and update grid positions
    const positions: { key: string; gridRow: number; gridCol: number }[] = [];
    for (const s of shortcuts) {
      if (!s.folderId && s.gridRow >= 0 && s.gridCol >= 0) {
        positions.push({ key: s.id, gridRow: s.gridRow, gridCol: s.gridCol });
      }
    }
    for (const f of folders) {
      if (f.gridRow >= 0 && f.gridCol >= 0) {
        positions.push({ key: f.id, gridRow: f.gridRow, gridCol: f.gridCol });
      }
    }
    // Include real file positions
    for (const rf of this.realFiles$.value) {
      if (rf.gridRow >= 0 && rf.gridCol >= 0) {
        positions.push({ key: rf.name, gridRow: rf.gridRow, gridCol: rf.gridCol });
      }
    }

    // Update folder map in settings
    const folderMap: { [id: string]: string } = {};
    for (const f of folders) {
      const existingMap = this.ussBackend.getSettings().folderMap || {};
      folderMap[f.id] = existingMap[f.id] || f.name;
    }

    // Execute all writes
    if (writeOps.length > 0) {
      forkJoin(writeOps).subscribe(
        () => {},
        (err) => {
          this.logger.warn('Could not save shortcuts to USS', err);
          this.notifySaveError(err);
        }
      );
    }

    // Update positions and settings
    if (positions.length > 0) {
      this.ussBackend.updatePositions(positions).subscribe(
        () => {},
        (err) => this.logger.warn('Could not save grid positions', err)
      );
    }

    this.ussBackend.updateSettings({
      folderMap,
      pinnedFolderIds: this.pinnedFolderIds$.value,
      launchMenuFolderIds: this.launchMenuFolderIds$.value
    }).subscribe(
      () => {},
      (err) => this.logger.warn('Could not save desktop settings', err)
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

  /** Whether file-backed storage is currently active */
  get isFileBacked(): boolean {
    return this.fileBackedMode;
  }

  /** Set all state to empty */
  private setEmptyState(): void {
    this.shortcuts$.next([]);
    this.folders$.next([]);
    this.pinnedFolderIds$.next([]);
    this.launchMenuFolderIds$.next([]);
    this.realFiles$.next([]);
  }

  // -- Trash operations (file-backed mode only) --

  /** Empty the trash directory. Requires user confirmation in the UI. */
  emptyTrash(): void {
    if (!this.fileBackedMode || !this.ussBackend) return;
    this.ussBackend.emptyTrash().subscribe(
      () => this.trashHasEntries$.next(false),
      (err) => {
        this.logger.warn('Failed to empty trash: ' + err);
        this.notifySaveError(err);
      }
    );
  }

  // -- File association operations (file-backed mode only) --

  /** Get the app associated with a file extension */
  getFileAssociation(ext: string): string | null {
    if (!this.ussBackend) return null;
    return this.ussBackend.getFileAssociation(ext);
  }

  /** Set a file extension -> app association */
  setFileAssociation(ext: string, pluginId: string): void {
    if (!this.ussBackend) return;
    this.ussBackend.setFileAssociation(ext, pluginId).subscribe(
      () => {
        this.fileAssociations$.next(this.ussBackend!.getSettings().fileAssociations || {});
      },
      (err) => this.logger.warn('Failed to save file association: ' + err)
    );
  }

  /** Invoke a real file (double-click) -- check file associations and launch */
  invokeRealFile(file: DesktopRealFile, applicationManager: MVDHosting.ApplicationManagerInterface): void {
    const ext = file.name.includes('.') ? file.name.split('.').pop()! : '';
    const assocPluginId = ext ? this.getFileAssociation(ext) : null;
    if (assocPluginId) {
      const plugin = ZoweZLUX.pluginManager.getPlugin(assocPluginId);
      if (plugin) {
        const pluginDef = { basePlugin: plugin, getBasePlugin: () => plugin };
        applicationManager.spawnApplication(pluginDef as any, { data: { type: 'openFile', name: file.path } });
        return;
      }
    }
    // No association -- try to open with the editor as a default fallback
    const editorPlugin = ZoweZLUX.pluginManager.getPlugin('org.zowe.editor');
    if (editorPlugin) {
      const pluginDef = { basePlugin: editorPlugin, getBasePlugin: () => editorPlugin };
      applicationManager.spawnApplication(pluginDef as any, { data: { type: 'openFile', name: file.path } });
    } else {
      this.logger.warn('No file association and no editor available for: ' + file.name);
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
