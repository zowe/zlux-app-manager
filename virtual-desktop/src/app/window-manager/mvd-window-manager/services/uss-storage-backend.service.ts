/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, Subject, timer } from 'rxjs';
import { switchMap, map, catchError, tap, finalize } from 'rxjs/operators';
import { BaseLogger } from 'virtual-desktop-logger';
import { UssFileService, UssEntry } from './uss-file.service';
import { DesktopShortcut, DesktopShortcutAction, DesktopFolder, sanitizeIconUrl, generateShortcutId } from './desktop-shortcuts.types';

declare var ZoweZLUX: any;

// ---------------------------------------------------------------------------
// File-format interfaces
// ---------------------------------------------------------------------------

/** JSON schema for a single Zowe shortcut file in .zweStore/ */
export interface ZweStoreShortcut {
  id: string;
  pluginId: string;
  displayLabel?: string;
  displayIcon?: string;
  action?: DesktopShortcutAction;
  folderId?: string;
  order?: number;
}

/** Schema for .desktop-file-meta.json -- keyed by shortcut ID or filename */
export interface DesktopFileMeta {
  [key: string]: { gridRow: number; gridCol: number };
}

/** Schema for .desktop-settings.json */
export interface DesktopSettings {
  folderMap?: { [folderId: string]: string };
  pinnedFolderIds?: string[];
  launchMenuFolderIds?: string[];
  hiddenSystemShortcuts?: string[];
  fileAssociations?: { [ext: string]: string };
}

/** Snapshot of a directory listing used for poll-based change detection */
interface DirSnapshot {
  entries: Map<string, { directory: boolean; size: number }>;
}

/**
 * Represents a real USS file displayed on the desktop.
 * These are not Zowe shortcuts -- they are files that exist in the shortcuts directory.
 */
export interface DesktopRealFile {
  name: string;
  path: string;
  directory: boolean;
  size: number;
  gridRow: number;
  gridCol: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * USS file-backed storage backend for desktop shortcuts.
 *
 * Manages the entire lifecycle of file-backed shortcuts including:
 *  - Reading/writing .zweStore/ shortcut files
 *  - Reading/writing .desktop-settings.json and .desktop-file-meta.json
 *  - Migration from config dataservice shortcuts.json
 *  - Trash (.zweTrash/) with auto-purge
 *  - Polling for external changes
 *  - File associations
 *  - Admin/system shortcuts merge
 */
@Injectable()
export class UssStorageBackend {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;

  /** Root shortcuts directory path -- set after init */
  private rootPath: string = '';

  /** System shortcuts directory path (admin-provisioned, read-only) */
  private systemRootPath: string | null = null;

  /** Cached .desktop-settings.json */
  private settings: DesktopSettings = {};

  /** Cached .desktop-file-meta.json */
  private fileMeta: DesktopFileMeta = {};

  /** Dirty set for .desktop-file-meta.json concurrent-write safety */
  private metaDirtyKeys = new Set<string>();

  /** Dirty set for .desktop-settings.json concurrent-write safety (top-level keys) */
  private settingsDirtyKeys = new Set<string>();

  /** Poll interval timer ID */
  private pollTimerId: any = null;

  /** Whether a poll is currently in-flight */
  private pollInFlight = false;

  /** Snapshot of directory state for change detection */
  private rootSnapshot: DirSnapshot = { entries: new Map() };
  private zweStoreSnapshot: DirSnapshot = { entries: new Map() };


  /** Size of metadata files for change detection */
  private metaFileSize: number = -1;
  private settingsFileSize: number = -1;

  /** Last user interaction time for idle detection */
  private lastInteractionTime: number = Date.now();

  /** Last auto-purge check timestamp */
  private lastPurgeCheck: number = 0;

  /** Poll interval in milliseconds */
  private pollInterval: number = 30000;

  /** Emits when polling detects external changes */
  readonly externalChange$ = new Subject<void>();

  /** Cached real files on the desktop */
  private realFiles: DesktopRealFile[] = [];

  /** Whether the trash directory has entries (for UI) */
  private trashHasEntries = false;

  constructor(private uss: UssFileService) {}

  // =========================================================================
  // Initialization
  // =========================================================================

  /**
   * Initialize the USS storage backend.
   * Resolves the shortcuts root, ensures directory structure exists,
   * and starts polling for external changes.
   */
  init(rootPath: string, systemRootPath: string | null, pollInterval: number): Observable<{
    shortcuts: DesktopShortcut[];
    folders: DesktopFolder[];
    pinnedFolderIds: string[];
    launchMenuFolderIds: string[];
    realFiles: DesktopRealFile[];
  }> {
    this.rootPath = rootPath;
    this.systemRootPath = systemRootPath;
    this.pollInterval = pollInterval || 30000;

    return this.ensureDirectoryStructure().pipe(
      switchMap(() => this.loadAll()),
      tap(() => {
        this.startPolling();
        this.autoPurgeTrash();
      })
    );
  }

  /** Ensure .zweStore/, .zweTrash/ exist; create root if needed */
  private ensureDirectoryStructure(): Observable<void> {
    return this.uss.mkdir(this.rootPath, true).pipe(
      switchMap(() => forkJoin([
        this.uss.mkdir(this.p('.zweStore')).pipe(catchError(() => of(void 0))),
        this.uss.mkdir(this.p('.zweTrash')).pipe(catchError(() => of(void 0)))
      ])),
      map(() => void 0)
    );
  }

  // =========================================================================
  // Read path
  // =========================================================================

  /**
   * Load all desktop state from USS files.
   * Reads directory listings, .zweStore/*.json, .desktop-settings.json,
   * .desktop-file-meta.json, resolves folderMap, and merges into the
   * existing DesktopShortcut/DesktopFolder model.
   */
  loadAll(): Observable<{
    shortcuts: DesktopShortcut[];
    folders: DesktopFolder[];
    pinnedFolderIds: string[];
    launchMenuFolderIds: string[];
    realFiles: DesktopRealFile[];
  }> {
    return forkJoin([
      this.uss.listDir(this.rootPath).pipe(catchError(() => of([] as UssEntry[]))),
      this.uss.listDir(this.p('.zweStore')).pipe(catchError(() => of([] as UssEntry[]))),
      this.readJsonFile<DesktopSettings>(this.p('.desktop-settings.json')).pipe(catchError(() => of({} as DesktopSettings))),
      this.readJsonFile<DesktopFileMeta>(this.p('.desktop-file-meta.json')).pipe(catchError(() => of({} as DesktopFileMeta))),
    ]).pipe(
      switchMap(([rootEntries, storeEntries, settings, meta]) => {
        this.settings = settings;
        this.fileMeta = meta;

        // Snapshot for polling
        this.rootSnapshot = this.buildSnapshot(rootEntries);
        this.zweStoreSnapshot = this.buildSnapshot(storeEntries);
        this.recordMetaFileSizes(rootEntries);

        // Read all shortcut JSON files in parallel
        const storeJsonFiles = storeEntries.filter(e => !e.directory && e.name.endsWith('.json'));
        const readShortcuts$ = storeJsonFiles.length > 0
          ? forkJoin(storeJsonFiles.map(e =>
              this.readJsonFile<ZweStoreShortcut>(e.path).pipe(
                catchError(err => {
                  this.logger.warn('Failed to read shortcut file: ' + e.path);
                  return of(null);
                })
              )
            ))
          : of([] as (ZweStoreShortcut | null)[]);

        // Read system shortcuts if configured
        const readSystem$ = this.systemRootPath
          ? this.loadSystemShortcuts()
          : of([] as DesktopShortcut[]);

        return forkJoin([readShortcuts$, readSystem$]).pipe(
          map(([storeShortcuts, systemShortcuts]) => {
            return this.assembleDesktopState(
              rootEntries, storeShortcuts.filter((s): s is ZweStoreShortcut => s !== null),
              systemShortcuts
            );
          })
        );
      })
    );
  }

  /**
   * Assemble DesktopShortcut[], DesktopFolder[], and DesktopRealFile[]
   * from raw directory entries and parsed .zweStore/ files.
   */
  private assembleDesktopState(
    rootEntries: UssEntry[],
    storeShortcuts: ZweStoreShortcut[],
    systemShortcuts: DesktopShortcut[]
  ): {
    shortcuts: DesktopShortcut[];
    folders: DesktopFolder[];
    pinnedFolderIds: string[];
    launchMenuFolderIds: string[];
    realFiles: DesktopRealFile[];
  } {
    const folderMap = this.settings.folderMap || {};

    // Validate folderMap entries -- prune if directory no longer exists
    const visibleEntries = rootEntries.filter(e => !e.name.startsWith('.'));
    const existingDirNames = new Set(visibleEntries.filter(e => e.directory).map(e => e.name));
    const validFolderMap: { [id: string]: string } = {};
    for (const [folderId, dirName] of Object.entries(folderMap)) {
      if (existingDirNames.has(dirName)) {
        validFolderMap[folderId] = dirName;
      } else {
        this.logger.info('Pruning orphaned folderMap entry: ' + folderId + ' -> ' + dirName);
      }
    }

    // Auto-discover directories not in folderMap (externally created)
    const mappedDirNames = new Set(Object.values(validFolderMap));
    for (const entry of visibleEntries) {
      if (entry.directory && !mappedDirNames.has(entry.name)) {
        const newId = generateShortcutId().replace('sc-', 'folder-');
        validFolderMap[newId] = entry.name;
        this.logger.info('Auto-discovered folder: ' + entry.name + ' -> ' + newId);
      }
    }

    // Update settings if folderMap changed
    if (JSON.stringify(validFolderMap) !== JSON.stringify(folderMap)) {
      this.settings.folderMap = validFolderMap;
      this.settingsDirtyKeys.add('folderMap');
      this.writeSettings().subscribe();
    }

    // Build DesktopFolder[] from folderMap
    const folders: DesktopFolder[] = Object.entries(validFolderMap).map(([id, dirName]) => {
      const pos = this.fileMeta[id];
      return {
        id,
        name: dirName,
        gridRow: pos?.gridRow ?? -1,
        gridCol: pos?.gridCol ?? -1
      };
    });

    // Build DesktopShortcut[] from .zweStore/ files
    const shortcuts: DesktopShortcut[] = storeShortcuts.map(ss => {
      const pos = this.fileMeta[ss.id];
      const shortcut: DesktopShortcut = {
        id: ss.id,
        pluginId: ss.pluginId,
        gridRow: pos?.gridRow ?? -1,
        gridCol: pos?.gridCol ?? -1,
        displayLabel: ss.displayLabel,
        displayIcon: sanitizeIconUrl(ss.displayIcon),
        action: ss.action,
        folderId: ss.folderId
      };
      return shortcut;
    });

    // Merge system shortcuts (admin-provisioned, read-only)
    const mergedShortcuts = this.mergeSystemShortcuts(shortcuts, systemShortcuts);

    // Build DesktopRealFile[] from visible non-directory entries
    const folderDirNames = new Set(Object.values(validFolderMap));
    const realFiles: DesktopRealFile[] = visibleEntries
      .filter(e => !e.directory && !folderDirNames.has(e.name))
      .map(e => {
        const pos = this.fileMeta[e.name];
        return {
          name: e.name,
          path: e.path,
          directory: false,
          size: e.size,
          gridRow: pos?.gridRow ?? -1,
          gridCol: pos?.gridCol ?? -1
        };
      });
    this.realFiles = realFiles;

    // Release shortcuts whose folderId references a pruned folder
    const validFolderIds = new Set(Object.keys(validFolderMap));
    for (const s of mergedShortcuts) {
      if (s.folderId && !validFolderIds.has(s.folderId)) {
        s.folderId = undefined;
      }
    }

    return {
      shortcuts: mergedShortcuts,
      folders,
      pinnedFolderIds: (this.settings.pinnedFolderIds || []).filter(id => validFolderIds.has(id)),
      launchMenuFolderIds: (this.settings.launchMenuFolderIds || []).filter(id => validFolderIds.has(id)),
      realFiles
    };
  }

  /** Get current real files */
  getRealFiles(): DesktopRealFile[] {
    return this.realFiles;
  }

  /** Check if trash has entries */
  hasTrashEntries(): boolean {
    return this.trashHasEntries;
  }

  // =========================================================================
  // Write path -- Zowe shortcuts
  // =========================================================================

  /** Write a shortcut to .zweStore/ */
  writeShortcut(shortcut: DesktopShortcut): Observable<void> {
    const store: ZweStoreShortcut = {
      id: shortcut.id,
      pluginId: shortcut.pluginId,
      displayLabel: shortcut.displayLabel,
      displayIcon: shortcut.displayIcon,
      action: shortcut.action,
      folderId: shortcut.folderId
    };
    const filename = this.shortcutFilename(shortcut);
    return this.uss.writeFile(this.p('.zweStore/' + filename), JSON.stringify(store, null, 2));
  }

  /** Delete a shortcut file from .zweStore/ by finding its filename */
  deleteShortcutFile(shortcutId: string): Observable<void> {
    return this.uss.listDir(this.p('.zweStore')).pipe(
      switchMap(entries => {
        const match = entries.find(e => e.name.includes(shortcutId));
        if (match) {
          return this.uss.delete(match.path);
        }
        return of(void 0);
      })
    );
  }

  /** Write multiple shortcuts (used during migration and bulk operations) */
  writeShortcuts(shortcuts: DesktopShortcut[]): Observable<void> {
    if (shortcuts.length === 0) return of(void 0);
    return forkJoin(shortcuts.map(s => this.writeShortcut(s))).pipe(map(() => void 0));
  }

  // =========================================================================
  // Write path -- Grid positions (.desktop-file-meta.json)
  // =========================================================================

  /**
   * Update grid positions using read-merge-write strategy.
   * Only entries in the dirty set are written.
   */
  updatePositions(positions: { key: string; gridRow: number; gridCol: number }[]): Observable<void> {
    for (const p of positions) {
      this.fileMeta[p.key] = { gridRow: p.gridRow, gridCol: p.gridCol };
      this.metaDirtyKeys.add(p.key);
    }
    return this.writeMetaFile();
  }

  /** Remove a position entry from .desktop-file-meta.json */
  removePosition(key: string): void {
    delete this.fileMeta[key];
    this.metaDirtyKeys.add(key);
  }

  /** Write .desktop-file-meta.json with read-merge-write for concurrent safety */
  private writeMetaFile(): Observable<void> {
    if (this.metaDirtyKeys.size === 0) return of(void 0);
    return this.readJsonFile<DesktopFileMeta>(this.p('.desktop-file-meta.json')).pipe(
      catchError(() => of({} as DesktopFileMeta)),
      switchMap(diskMeta => {
        // Merge: accept all disk entries, overlay our dirty keys
        const merged: DesktopFileMeta = { ...diskMeta };
        for (const key of this.metaDirtyKeys) {
          if (this.fileMeta[key]) {
            merged[key] = this.fileMeta[key];
          } else {
            delete merged[key];
          }
        }
        this.fileMeta = merged;
        this.metaDirtyKeys.clear();
        return this.uss.writeFile(this.p('.desktop-file-meta.json'), JSON.stringify(merged, null, 2));
      })
    );
  }

  // =========================================================================
  // Write path -- Desktop settings (.desktop-settings.json)
  // =========================================================================

  /** Update specific keys in .desktop-settings.json with read-merge-write */
  updateSettings(partial: Partial<DesktopSettings>): Observable<void> {
    Object.assign(this.settings, partial);
    for (const key of Object.keys(partial)) {
      this.settingsDirtyKeys.add(key);
    }
    return this.writeSettings();
  }

  /** Write .desktop-settings.json with read-merge-write for concurrent safety */
  private writeSettings(): Observable<void> {
    if (this.settingsDirtyKeys.size === 0) return of(void 0);
    return this.readJsonFile<DesktopSettings>(this.p('.desktop-settings.json')).pipe(
      catchError(() => of({} as DesktopSettings)),
      switchMap(diskSettings => {
        // Merge: accept all disk keys, overlay only our dirty keys
        const merged: DesktopSettings = { ...diskSettings };
        for (const key of this.settingsDirtyKeys) {
          (merged as any)[key] = (this.settings as any)[key];
        }
        this.settings = merged;
        this.settingsDirtyKeys.clear();
        return this.uss.writeFile(this.p('.desktop-settings.json'), JSON.stringify(merged, null, 2));
      })
    );
  }

  /** Get current settings */
  getSettings(): DesktopSettings {
    return this.settings;
  }

  // =========================================================================
  // Folder operations
  // =========================================================================

  /** Create a USS directory for a folder */
  createFolderDir(folderName: string): Observable<void> {
    this.validateFolderName(folderName);
    return this.uss.mkdir(this.rootPath + '/' + folderName);
  }

  /** Rename a USS directory */
  renameFolderDir(oldName: string, newName: string): Observable<void> {
    this.validateFolderName(newName);
    return this.uss.move(this.rootPath + '/' + oldName, this.rootPath + '/' + newName);
  }

  /** Validate a folder name for filesystem safety */
  private validateFolderName(name: string): void {
    if (!name || name.length === 0) {
      throw new Error('Folder name cannot be empty');
    }
    if (name === '.' || name === '..') {
      throw new Error('Invalid folder name: ' + name);
    }
    if (name.startsWith('.')) {
      throw new Error('Folder name cannot start with "."');
    }
    if (name.includes('/')) {
      throw new Error('Folder name cannot contain "/"');
    }
    // Check for control characters
    if (/[\x00-\x1f\x7f]/.test(name)) {
      throw new Error('Folder name cannot contain control characters');
    }
    if (new TextEncoder().encode(name).length > 255) {
      throw new Error('Folder name exceeds 255 bytes');
    }
    const reserved = ['.zweStore', '.zweTrash', '.desktop-settings.json', '.desktop-file-meta.json'];
    if (reserved.includes(name)) {
      throw new Error('Folder name "' + name + '" is reserved');
    }
  }

  /**
   * Validate that a folder path resolves within the shortcuts root.
   * Prevents path traversal attacks via folderMap entries.
   */


  // =========================================================================
  // Trash / Undo
  // =========================================================================

  /** Move a file to .zweTrash/ with .t<epoch> suffix */
  moveToTrash(sourcePath: string, originalName: string): Observable<string> {
    const epoch = Math.floor(Date.now() / 1000);
    const trashName = originalName + '.t' + epoch;
    const trashPath = this.p('.zweTrash/' + trashName);
    return this.uss.move(sourcePath, trashPath).pipe(
      tap(() => { this.trashHasEntries = true; }),
      map(() => trashName)
    );
  }

  /** Move a folder directory from root to .zweTrash/ */
  moveFolderToTrash(folderName: string): Observable<string> {
    return this.moveToTrash(this.p(folderName), folderName);
  }

  /** Move a shortcut JSON from .zweStore/ to .zweTrash/ */
  moveShortcutToTrash(shortcutId: string): Observable<string> {
    return this.uss.listDir(this.p('.zweStore')).pipe(
      switchMap(entries => {
        const match = entries.find(e => e.name.includes(shortcutId));
        if (!match) {
          this.logger.warn('Shortcut file not found for trash: ' + shortcutId);
          return of('');
        }
        return this.moveToTrash(match.path, match.name);
      })
    );
  }

  /** Restore a file from .zweTrash/ to its original location */
  restoreFromTrash(trashFilename: string, restorePath: string): Observable<void> {
    const trashPath = this.p('.zweTrash/' + trashFilename);
    return this.uss.move(trashPath, restorePath);
  }

  /** Empty the entire trash */
  emptyTrash(): Observable<void> {
    return this.uss.listDir(this.p('.zweTrash')).pipe(
      switchMap(entries => {
        if (entries.length === 0) return of(void 0);
        return forkJoin(entries.map(e => this.uss.delete(e.path).pipe(catchError(() => of(void 0))))).pipe(
          map(() => void 0)
        );
      }),
      tap(() => { this.trashHasEntries = false; })
    );
  }

  /** Auto-purge trash entries older than 30 days */
  private autoPurgeTrash(): void {
    this.lastPurgeCheck = Date.now();
    this.uss.listDir(this.p('.zweTrash')).pipe(
      catchError(() => of([] as UssEntry[]))
    ).subscribe(entries => {
      this.trashHasEntries = entries.length > 0;
      const now = Math.floor(Date.now() / 1000);
      for (const entry of entries) {
        const epoch = this.parseTrashEpoch(entry.name);
        if (epoch !== null && (now - epoch) > 2592000) {
          this.uss.delete(entry.path).subscribe(
            () => this.logger.info('Auto-purged trash entry: ' + entry.name),
            (err: any) => this.logger.warn('Failed to purge trash entry: ' + entry.name)
          );
        }
      }
    });
  }

  /** Parse the .t<epoch> suffix from a trash filename. Returns null if not parseable. */
  private parseTrashEpoch(filename: string): number | null {
    const match = filename.match(/\.t(\d+)$/);
    if (!match) return null;
    const epoch = parseInt(match[1], 10);
    return isNaN(epoch) ? null : epoch;
  }

  /** Strip the .t<epoch> suffix from a trash filename to get the original name */
  stripTrashSuffix(trashFilename: string): string {
    return trashFilename.replace(/\.t\d+$/, '');
  }

  // =========================================================================
  // Polling for external changes
  // =========================================================================

  /** Start the polling timer with visibility gating and idle detection */
  private startPolling(): void {
    this.setupIdleTracking();
    this.setupVisibilityGating();

    this.pollTimerId = setInterval(() => {
      if (this.pollInFlight) return;
      if (document.hidden) return;
      if (Date.now() - this.lastInteractionTime > 300000) return;

      // Periodic auto-purge check (every 24 hours for long-lived sessions)
      if (Date.now() - this.lastPurgeCheck > 24 * 60 * 60 * 1000) {
        this.autoPurgeTrash();
      }

      this.poll();
    }, this.pollInterval);
  }

  /** Stop polling (e.g. on logout) */
  stopPolling(): void {
    if (this.pollTimerId !== null) {
      clearInterval(this.pollTimerId);
      this.pollTimerId = null;
    }
  }

  /** Perform one poll cycle, detecting external changes */
  poll(): void {
    if (this.pollInFlight) return;
    this.pollInFlight = true;

    forkJoin([
      this.uss.listDir(this.rootPath).pipe(catchError(() => of([] as UssEntry[]))),
      this.uss.listDir(this.p('.zweStore')).pipe(catchError(() => of([] as UssEntry[])))
    ]).pipe(
      finalize(() => { this.pollInFlight = false; })
    ).subscribe(([rootEntries, storeEntries]) => {
      const newRootSnap = this.buildSnapshot(rootEntries);
      const newStoreSnap = this.buildSnapshot(storeEntries);

      let changed = false;

      // Detect root directory changes
      if (!this.snapshotsEqual(this.rootSnapshot, newRootSnap)) {
        changed = true;
        this.rootSnapshot = newRootSnap;
      }

      // Detect .zweStore/ changes
      if (!this.snapshotsEqual(this.zweStoreSnapshot, newStoreSnap)) {
        changed = true;
        this.zweStoreSnapshot = newStoreSnap;
      }

      // Check metadata file sizes for changes
      const metaEntry = rootEntries.find(e => e.name === '.desktop-file-meta.json');
      const settingsEntry = rootEntries.find(e => e.name === '.desktop-settings.json');
      if (metaEntry && metaEntry.size !== this.metaFileSize) {
        changed = true;
        this.metaFileSize = metaEntry.size;
      }
      if (settingsEntry && settingsEntry.size !== this.settingsFileSize) {
        changed = true;
        this.settingsFileSize = settingsEntry.size;
      }

      if (changed) {
        this.externalChange$.next();
      }
    });
  }

  /** Build a snapshot from directory entries for change detection */
  private buildSnapshot(entries: UssEntry[]): DirSnapshot {
    const map = new Map<string, { directory: boolean; size: number }>();
    for (const e of entries) {
      map.set(e.name, { directory: e.directory, size: e.size });
    }
    return { entries: map };
  }

  /** Compare two snapshots for equality */
  private snapshotsEqual(a: DirSnapshot, b: DirSnapshot): boolean {
    if (a.entries.size !== b.entries.size) return false;
    for (const [name, info] of a.entries) {
      const other = b.entries.get(name);
      if (!other || other.directory !== info.directory || other.size !== info.size) {
        return false;
      }
    }
    return true;
  }

  /** Record metadata file sizes from a root directory listing */
  private recordMetaFileSizes(rootEntries: UssEntry[]): void {
    const metaEntry = rootEntries.find(e => e.name === '.desktop-file-meta.json');
    const settingsEntry = rootEntries.find(e => e.name === '.desktop-settings.json');
    this.metaFileSize = metaEntry?.size ?? -1;
    this.settingsFileSize = settingsEntry?.size ?? -1;
  }

  /** Track user interactions for idle detection */
  private setupIdleTracking(): void {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    for (const event of events) {
      document.addEventListener(event, () => {
        this.lastInteractionTime = Date.now();
      }, { passive: true });
    }
  }

  /** Handle page visibility changes -- pause/resume polling */
  private setupVisibilityGating(): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.poll();
      }
    });
  }

  // =========================================================================
  // Migration from shortcuts.json
  // =========================================================================

  /**
   * Migrate from config dataservice shortcuts.json to file-backed storage.
   * Returns true if migration was performed, false if skipped.
   */
  migrate(
    shortcuts: DesktopShortcut[],
    folders: DesktopFolder[],
    pinnedFolderIds: string[],
    launchMenuFolderIds: string[]
  ): Observable<boolean> {
    // Check if .zweStore/ already has files (migration already completed)
    return this.uss.listDir(this.p('.zweStore')).pipe(
      catchError(() => of([] as UssEntry[])),
      switchMap(entries => {
        const jsonFiles = entries.filter(e => e.name.endsWith('.json'));
        if (jsonFiles.length > 0) {
          this.logger.info('Migration skipped -- .zweStore/ already contains ' + jsonFiles.length + ' files');
          return of(false);
        }

        // If .zweStore/ exists but is empty, another tab may be mid-migration.
        // Wait 3 seconds and re-check as a race guard.
        if (entries.length > 0) {
          return timer(3000).pipe(
            switchMap(() => this.uss.listDir(this.p('.zweStore')).pipe(catchError(() => of([] as UssEntry[])))),
            switchMap(retryEntries => {
              if (retryEntries.some(e => e.name.endsWith('.json'))) {
                this.logger.info('Migration skipped after retry -- another tab completed migration');
                return of(false);
              }
              return this.performMigration(shortcuts, folders, pinnedFolderIds, launchMenuFolderIds);
            })
          );
        }

        return this.performMigration(shortcuts, folders, pinnedFolderIds, launchMenuFolderIds);
      })
    );
  }

  /** Execute the actual migration */
  private performMigration(
    shortcuts: DesktopShortcut[],
    folders: DesktopFolder[],
    pinnedFolderIds: string[],
    launchMenuFolderIds: string[]
  ): Observable<boolean> {
    this.logger.info('Starting migration of ' + shortcuts.length + ' shortcuts and ' + folders.length + ' folders');

    const operations: Observable<void>[] = [];

    // 1. Create folder directories and build folderMap
    const folderMap: { [id: string]: string } = {};
    for (const folder of folders) {
      const safeName = this.sanitizeFolderName(folder.name);
      folderMap[folder.id] = safeName;
      operations.push(
        this.uss.mkdir(this.rootPath + '/' + safeName).pipe(catchError(() => of(void 0)))
      );
    }

    // 2. Write each shortcut to .zweStore/
    for (const shortcut of shortcuts) {
      const store: ZweStoreShortcut = {
        id: shortcut.id,
        pluginId: shortcut.pluginId,
        displayLabel: shortcut.displayLabel,
        displayIcon: shortcut.displayIcon,
        action: shortcut.action,
        folderId: shortcut.folderId
      };
      const filename = this.shortcutFilename(shortcut);
      operations.push(
        this.uss.writeFile(this.p('.zweStore/' + filename), JSON.stringify(store, null, 2))
      );
    }

    // 3. Write grid positions to .desktop-file-meta.json
    const meta: DesktopFileMeta = {};
    for (const shortcut of shortcuts) {
      if (shortcut.gridRow >= 0 && shortcut.gridCol >= 0) {
        meta[shortcut.id] = { gridRow: shortcut.gridRow, gridCol: shortcut.gridCol };
      }
    }
    for (const folder of folders) {
      if (folder.gridRow >= 0 && folder.gridCol >= 0) {
        meta[folder.id] = { gridRow: folder.gridRow, gridCol: folder.gridCol };
      }
    }

    // 4. Write .desktop-settings.json
    const settings: DesktopSettings = {
      folderMap,
      pinnedFolderIds,
      launchMenuFolderIds,
      hiddenSystemShortcuts: [],
      fileAssociations: {}
    };

    // Execute all file writes, then write the metadata files
    if (operations.length === 0) {
      operations.push(of(void 0));
    }

    return forkJoin(operations).pipe(
      switchMap(() => forkJoin([
        this.uss.writeFile(this.p('.desktop-file-meta.json'), JSON.stringify(meta, null, 2)),
        this.uss.writeFile(this.p('.desktop-settings.json'), JSON.stringify(settings, null, 2))
      ])),
      map(() => {
        this.logger.info('Migration completed successfully');
        this.fileMeta = meta;
        this.settings = settings;
        return true;
      }),
      catchError(err => {
        this.logger.warn('Migration failed: ' + (err.message || err));
        return of(false);
      })
    );
  }

  // =========================================================================
  // System (admin) shortcuts
  // =========================================================================

  /** Load shortcuts from the system-level directory */
  private loadSystemShortcuts(): Observable<DesktopShortcut[]> {
    if (!this.systemRootPath) return of([]);
    return this.uss.listDir(this.systemRootPath + '/.zweStore').pipe(
      catchError(() => of([] as UssEntry[])),
      switchMap(entries => {
        const jsonFiles = entries.filter(e => !e.directory && e.name.endsWith('.json'));
        if (jsonFiles.length === 0) return of([]);
        return forkJoin(
          jsonFiles.map(e =>
            this.readJsonFile<ZweStoreShortcut>(e.path).pipe(catchError(() => of(null)))
          )
        ).pipe(
          map(results => results
            .filter((s): s is ZweStoreShortcut => s !== null)
            .map(ss => ({
              id: ss.id,
              pluginId: ss.pluginId,
              gridRow: -1,
              gridCol: -1,
              displayLabel: ss.displayLabel,
              displayIcon: sanitizeIconUrl(ss.displayIcon),
              action: ss.action,
              folderId: ss.folderId,
              _system: true
            } as DesktopShortcut & { _system?: boolean }))
          )
        );
      })
    );
  }

  /** Merge system shortcuts with user shortcuts. User entries override by identity. */
  private mergeSystemShortcuts(userShortcuts: DesktopShortcut[], systemShortcuts: DesktopShortcut[]): DesktopShortcut[] {
    if (systemShortcuts.length === 0) return userShortcuts;

    const hiddenSet = new Set(this.settings.hiddenSystemShortcuts || []);
    const userIdentities = new Set(userShortcuts.map(s => this.shortcutIdentity(s)));

    const merged = [...userShortcuts];
    for (const sys of systemShortcuts) {
      const identity = this.shortcutIdentity(sys);
      // Skip if user has an override or if hidden
      if (userIdentities.has(identity) || hiddenSet.has(identity)) continue;
      merged.push(sys);
    }
    return merged;
  }

  /** Compute identity key for a shortcut (pluginId + actionId or pluginId alone) */
  private shortcutIdentity(s: DesktopShortcut): string {
    if (s.action?.id) {
      return s.pluginId + '::' + s.action.id;
    }
    return s.pluginId;
  }

  // =========================================================================
  // File associations
  // =========================================================================

  /** Get the app pluginId associated with a file extension */
  getFileAssociation(ext: string): string | null {
    return this.settings.fileAssociations?.[ext.toLowerCase()] || null;
  }

  /** Set a file association */
  setFileAssociation(ext: string, pluginId: string): Observable<void> {
    if (!this.settings.fileAssociations) {
      this.settings.fileAssociations = {};
    }
    this.settings.fileAssociations[ext.toLowerCase()] = pluginId;
    return this.updateSettings({ fileAssociations: this.settings.fileAssociations });
  }

  /** Remove a file association */
  removeFileAssociation(ext: string): Observable<void> {
    if (this.settings.fileAssociations) {
      delete this.settings.fileAssociations[ext.toLowerCase()];
      return this.updateSettings({ fileAssociations: this.settings.fileAssociations });
    }
    return of(void 0);
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /** Build a path relative to root */
  private p(relativePath: string): string {
    return this.rootPath + '/' + relativePath;
  }

  /** Read and parse a JSON file from USS */
  private readJsonFile<T>(path: string): Observable<T> {
    return this.uss.readFile(path).pipe(
      map(content => JSON.parse(content) as T)
    );
  }

  /**
   * Generate a filesystem-safe filename for a shortcut.
   * Format: <slug>-<id>.json
   */
  private shortcutFilename(shortcut: DesktopShortcut): string {
    const label = shortcut.displayLabel || shortcut.pluginId;
    const slug = this.slugify(label);
    return slug + '-' + shortcut.id + '.json';
  }

  /**
   * Slugify a label for use as a filename prefix.
   * Lowercase, replace spaces with -, strip non-alphanumeric, collapse hyphens,
   * truncate to 30 chars, trim leading/trailing hyphens.
   */
  private slugify(label: string): string {
    let slug = label.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
      .substring(0, 30)
      .replace(/^-+|-+$/g, '');
    return slug || 'shortcut';
  }

  /**
   * Sanitize a folder name for use as a USS directory name.
   * Replaces unsafe characters with hyphens.
   */
  private sanitizeFolderName(name: string): string {
    let safe = name
      .replace(/[/\x00-\x1f\x7f]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^\./, '_')
      .substring(0, 255);
    if (safe === '.' || safe === '..') safe = '_' + safe;
    const reserved = ['.zweStore', '.zweTrash', '.desktop-settings.json', '.desktop-file-meta.json'];
    if (reserved.includes(safe)) safe = '_' + safe;
    return safe || 'folder';
  }

  /** Clean up on destroy/logout */
  destroy(): void {
    this.stopPolling();
    this.externalChange$.complete();
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
