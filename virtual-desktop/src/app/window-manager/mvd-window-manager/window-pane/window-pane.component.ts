

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, OnDestroy, Injector, Input, HostListener, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { DesktopTheme } from "../desktop/desktop.component";
import { HttpClient, HttpResponse } from '@angular/common/http';
import { DesktopWindow } from '../shared/desktop-window';
import { WindowManagerService } from '../shared/window-manager.service';
import { BaseLogger } from 'virtual-desktop-logger';
import { ThemeEmitterService } from '../services/theme-emitter.service';
import { DesktopShortcut, DesktopFolder, DesktopShortcutsService } from '../services/desktop-shortcuts.service';
import { DesktopPluginDefinitionImpl } from '../../../plugin-manager/shared/desktop-plugin-definition';
import { DesktopFolderComponent } from '../desktop-folder/desktop-folder.component';
import { L10nTranslationService } from 'angular-l10n';
import { delay } from 'rxjs/operators';

const DESKTOP_PLUGIN = ZoweZLUX.pluginManager.getDesktopPlugin();
const DESKTOP_WALLPAPER_URI = ZoweZLUX.uriBroker.pluginConfigUri(DESKTOP_PLUGIN,'ui/themebin', 'wallpaper');
const DESKTOP_WALLPAPER_MAX_SIZE = 3;

@Component({
  selector: 'rs-com-window-pane',
  templateUrl: 'window-pane.component.html',
  styleUrls: ['window-pane.component.css']
})
export class WindowPaneComponent implements OnInit, OnDestroy, MVDHosting.LoginActionInterface, MVDHosting.LogoutActionInterface {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  public contextMenuDef: {xPos: number, yPos: number, items: ContextMenuItem[]} | null;
  public wallpaper: any = { };
  private authenticationManager: MVDHosting.AuthenticationManagerInterface;
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  private pluginManager: MVDHosting.PluginManagerInterface;

  @ViewChildren(DesktopFolderComponent) folderComponents: QueryList<DesktopFolderComponent>;

  @Input() set theme(newTheme: DesktopTheme) {
    this._theme = newTheme;
    if (newTheme?.size?.launchbar) {
      this.launchbarSize = newTheme.size.launchbar;
    }
    if (newTheme?.size?.window) {
      this.applyIconSize(newTheme.size.window);
    }
  }
  get theme(): DesktopTheme { return this._theme; }
  private _theme: DesktopTheme;

  shortcuts: DesktopShortcut[] = [];
  pluginMap: Map<string, DesktopPluginDefinitionImpl> = new Map();
  highlightedIconId: string | null = null;
  renameTargetKey: string | null = null;
  folders: DesktopFolder[] = [];
  highlightedFolderId: string | null = null;
  openFolderId: string | null = null;
  selectedKeys: Set<string> = new Set();
  marqueeActive = false;
  marqueeFadingOut = false;
  private marqueeFadeTimer: any = null;
  marqueeStartX = 0;
  marqueeStartY = 0;
  marqueeCurrentX = 0;
  marqueeCurrentY = 0;
  private boundMarqueeMove: (e: MouseEvent) => void;
  private boundMarqueeUp: (e: MouseEvent) => void;
  private marqueeJustEnded = false;
  private justDefocusedWindow = false;
  renameFolderTargetId: string | null = null;
  folderPreviewTargetKey: string | null = null;
  folderPreviewIcons: { url: string | null; label: string }[] = [];
  private dragSourceShortcut: DesktopShortcut | null = null;
  multiDragDelta: {x: number, y: number} | null = null;
  private multiDragSourceKey: string | null = null;
  propertiesShortcut: DesktopShortcut | null = null;
  private pinnedPluginIds: Set<string> = new Set();
  maxGridRows: number = 8;
  maxGridCols: number = 20;
  iconCellWidth: number = 90;
  iconCellHeight: number = 90;
  iconImageSize: number = 48;
  iconFontSize: number = 11;
  iconLetterSize: number = 22;
  gridPadding: number = 10;
  private launchbarSize: number = 2;
  private resizeTimer: any = null;

  constructor(
    public windowManager: WindowManagerService,
    private injector: Injector,
    private http: HttpClient,
    private themeService: ThemeEmitterService,
    private translation: L10nTranslationService,
    public shortcutsService: DesktopShortcutsService,
    private elementRef: ElementRef
  ) {
    this.logger.debug("ZWED5320I", windowManager); //this.logger.debug("Window-pane-component wMgr=",windowManager);
    this.contextMenuDef = null;
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
    this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
    this.authenticationManager.registerPostLoginAction(this);
    this.authenticationManager.registerPreLogoutAction(this);

    // Subscribe to pluginsAdded to build the plugin map with DesktopPluginDefinitionImpl wrappers
    this.pluginManager.pluginsAdded.subscribe((plugins: any[]) => {
      plugins.forEach((p: any) => {
        const baseDef = p.getBasePlugin?.()?.getBasePlugin?.();
        if (baseDef && baseDef.identifier) {
          this.pluginMap.set(baseDef.identifier, p);
        }
      });
    });

    this.shortcutsService.shortcuts$.subscribe(shortcuts => {
      this.shortcuts = shortcuts;
    });

    this.shortcutsService.folders$.subscribe(folders => {
      this.folders = folders;
    });

    // Listen for external shortcut changes
    window.addEventListener('zlux_desktop-shortcuts-changed', () => {
      this.shortcutsService.reloadShortcutsExternal();
    });

    // Listen for folder open requests from the taskbar
    window.addEventListener('zlux_desktop-open-folder', ((event: CustomEvent) => {
      const { folderId } = event.detail;
      if (folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (folder) {
          this.onFolderOpened(folder);
        }
      }
    }) as EventListener);

    // Subscribe to UI size changes from personalization panel
    this.themeService.onSizeChange.subscribe((size: any) => {
      if (size.launchbarSize) {
        this.launchbarSize = size.launchbarSize;
      }
      this.applyIconSize(size.windowSize || 2);
    });

    // Listen for launchbar pin changes from other sources
    window.addEventListener('zlux_desktop-pinned-plugins-changed', () => {
      this.loadPinnedPluginIds();
    });

    this.boundMarqueeMove = this.onMarqueeMouseMove.bind(this);
    this.boundMarqueeUp = this.onMarqueeMouseUp.bind(this);
  }

  private replaceWallpaper(url:string) {
    this.http.head(url, {observe: 'response'}).subscribe((result:HttpResponse<any>) => {
      if (result.status != 204 && result.ok) {
        this.wallpaper.background = `url(${url}) no-repeat center/cover`;
      }
    }, error => {
      this.resetWallpaperDefault();
    });
  }

  onLogout(username: string) {
    this.resetWallpaperDefault();
    return true;
  }

  onLogin(username:string, plugins:ZLUX.Plugin[]):boolean {
    this.replaceWallpaper(DESKTOP_WALLPAPER_URI);
    this.shortcutsService.loadShortcuts();
    this.loadPinnedPluginIds();
    return true;
  }

  getPluginForShortcut(shortcut: DesktopShortcut): DesktopPluginDefinitionImpl | undefined {
    return this.pluginMap.get(shortcut.pluginId);
  }

  isItemSelected(key: string): boolean {
    return this.selectedKeys.has(key);
  }

  onIconSelected(shortcut: DesktopShortcut): void {
    this.highlightedIconId = shortcut.id;
  }

  onIconClicked(event: { shortcut: DesktopShortcut; ctrlKey: boolean }): void {
    this.windowManager.clearFocusedWindow();
    const key = this.getShortcutKey(event.shortcut);
    if (event.ctrlKey) {
      // Ctrl+click: toggle this item in/out of the selection
      if (this.selectedKeys.has(key)) {
        this.selectedKeys.delete(key);
        this.highlightedIconId = null;
      } else {
        this.selectedKeys.add(key);
        this.highlightedIconId = key;
      }
      this.highlightedFolderId = null;
    } else {
      // Normal click: clear multi-select, select only this one
      this.selectedKeys.clear();
      this.selectedKeys.add(key);
      this.highlightedIconId = key;
      this.highlightedFolderId = null;
    }
  }

  onFolderClicked(event: { folder: DesktopFolder; ctrlKey: boolean }): void {
    this.windowManager.clearFocusedWindow();
    const key = 'folder:' + event.folder.id;
    if (event.ctrlKey) {
      if (this.selectedKeys.has(key)) {
        this.selectedKeys.delete(key);
        this.highlightedFolderId = null;
      } else {
        this.selectedKeys.add(key);
        this.highlightedFolderId = event.folder.id;
      }
      this.highlightedIconId = null;
    } else {
      this.selectedKeys.clear();
      this.selectedKeys.add(key);
      this.highlightedFolderId = event.folder.id;
      this.highlightedIconId = null;
    }
  }

  getShortcutKey(shortcut: DesktopShortcut): string {
    return shortcut.id;
  }

  onIconLaunched(shortcut: DesktopShortcut): void {
    const plugin = this.pluginMap.get(shortcut.pluginId);
    this.shortcutsService.invokeShortcut(shortcut, this.applicationManager, plugin);
    this.openFolderId = null;
  }

  onIconContextMenu(event: { event: MouseEvent; shortcut: DesktopShortcut }): void {
    const shortcut = event.shortcut;
    const plugin = this.pluginMap.get(shortcut.pluginId);
    const menuItems: ContextMenuItem[] = [
      {
        text: this.translation.translate('Open'),
        action: () => this.onIconLaunched(shortcut)
      },
      {
        text: this.translation.translate('Open in New Browser Tab'),
        action: () => this.openShortcutInNewTab(shortcut, plugin)
      },
      {
        text: this.translation.translate('Rename'),
        action: () => this.startIconRename(shortcut)
      },
      {
        text: this.translation.translate('Remove From Desktop'),
        action: () => this.shortcutsService.removeShortcutById(shortcut.id)
      },
      {
        text: this.translation.translate('Properties'),
        action: () => { this.propertiesShortcut = shortcut; }
      }
    ];
    // Pin/Unpin from Launchbar (only for plain plugin shortcuts, not action shortcuts)
    if (!shortcut.action) {
      const isPinned = this.pinnedPluginIds.has(shortcut.pluginId);
      menuItems.splice(2, 0, {
        text: isPinned ? this.translation.translate('Unpin from Taskbar') : this.translation.translate('Pin to Taskbar'),
        action: () => this.togglePinToLaunchbar(shortcut.pluginId, !isPinned)
      });
    }
    this.windowManager.contextMenuRequested.next({
      xPos: event.event.clientX,
      yPos: event.event.clientY,
      items: menuItems
    });
  }

  onIconMoved(event: { shortcut: DesktopShortcut; newRow: number; newCol: number }): void {
    if (this.dragConsumed) {
      this.dragConsumed = false;
      return;
    }
    this.shortcutsService.moveShortcut(event.shortcut.id, event.newRow, event.newCol);
  }

  onIconRenamed(event: { shortcut: DesktopShortcut; newLabel: string }): void {
    this.renameTargetKey = null;
    this.shortcutsService.renameShortcut(event.shortcut.id, event.newLabel);
  }

  onIconRenameCancelled(shortcut: DesktopShortcut): void {
    this.renameTargetKey = null;
  }

  private startIconRename(shortcut: DesktopShortcut): void {
    this.renameTargetKey = this.getShortcutKey(shortcut);
  }

  onFolderShortcutRenamed(event: { shortcut: DesktopShortcut; newLabel: string }): void {
    this.renameTargetKey = null;
    this.shortcutsService.renameShortcut(event.shortcut.id, event.newLabel);
  }

  onFolderShortcutRenameCancelled(shortcut: DesktopShortcut): void {
    this.renameTargetKey = null;
  }

  getRenameKeyForFolder(folderId: string): string | null {
    if (!this.renameTargetKey) return null;
    const shortcuts = this.getShortcutsInFolder(folderId);
    const match = shortcuts.find(s => this.getShortcutKey(s) === this.renameTargetKey);
    return match ? this.renameTargetKey : null;
  }

  private openShortcutInNewTab(shortcut: DesktopShortcut, plugin?: DesktopPluginDefinitionImpl): void {
    const targetPluginId = shortcut.action?.targetPluginId || shortcut.pluginId;
    const targetPlugin = this.pluginMap.get(targetPluginId);
    if (targetPlugin) {
      const pluginType = targetPlugin.getFramework();
      if (pluginType === 'iframe' && !(targetPlugin as any).standaloneUseFramework) {
        const webContent = targetPlugin.getBasePlugin().getWebContent();
        if (webContent?.destination > '') {
          window.open(`${location.origin}${ZoweZLUX.uriBroker.pluginIframeUri(targetPlugin.getBasePlugin(), '')}`);
        } else if (webContent) {
          window.open(`${location.origin}${ZoweZLUX.uriBroker.pluginResourceUri(targetPlugin.getBasePlugin(), webContent.startingPage)}`);
        } else {
          window.open(`${location.href}?pluginId=${targetPluginId}&showLogin=true`);
        }
      } else {
        window.open(`${location.href}?pluginId=${targetPluginId}&showLogin=true`);
      }
    } else {
      window.open(`${location.href}?pluginId=${targetPluginId}&showLogin=true`);
    }
  }

  /** Only shortcuts not inside a folder */
  get topLevelShortcuts(): DesktopShortcut[] {
    return this.shortcuts.filter(s => !s.folderId);
  }

  getShortcutsInFolder(folderId: string): DesktopShortcut[] {
    return this.shortcuts.filter(s => s.folderId === folderId);
  }

  // -- Folder event handlers --

  onFolderSelected(folder: DesktopFolder): void {
    this.highlightedFolderId = folder.id;
    this.highlightedIconId = null;
  }

  onFolderOpened(folder: DesktopFolder): void {
    if (this.openFolderId === folder.id) {
      this.openFolderId = null;
    } else {
      this.openFolderId = folder.id;
      // Initialize keyboard focus at first item when folder opens
      const folderComp = this.folderComponents?.find(fc => fc.folder?.id === folder.id);
      if (folderComp) {
        folderComp.focusedExpandedIndex = 0;
      }
    }
  }

  onFolderContextMenu(event: { event: MouseEvent; folder: DesktopFolder }): void {
    const folder = event.folder;
    const isPinned = this.shortcutsService.isFolderPinned(folder.id);
    const isInLaunchMenu = this.shortcutsService.isFolderInLaunchMenu(folder.id);
    const menuItems: ContextMenuItem[] = [
      {
        text: this.translation.translate('Open Folder'),
        action: () => this.onFolderOpened(folder)
      },
      {
        text: this.translation.translate('Rename'),
        action: () => { this.renameFolderTargetId = folder.id; }
      },
      {
        text: isPinned ? this.translation.translate('Unpin from Taskbar') : this.translation.translate('Pin to Taskbar'),
        action: () => isPinned ? this.shortcutsService.unpinFolder(folder.id) : this.shortcutsService.pinFolder(folder.id)
      },
      {
        text: isInLaunchMenu ? this.translation.translate('Unpin from Launch Menu') : this.translation.translate('Pin to Launch Menu'),
        action: () => isInLaunchMenu ? this.shortcutsService.unpinFromLaunchMenu(folder.id) : this.shortcutsService.pinToLaunchMenu(folder.id)
      },
      {
        text: this.translation.translate('Delete Folder'),
        action: () => this.shortcutsService.deleteFolder(folder.id)
      }
    ];
    this.windowManager.contextMenuRequested.next({
      xPos: event.event.clientX,
      yPos: event.event.clientY,
      items: menuItems
    });
  }

  onFolderMoved(event: { folder: DesktopFolder; newRow: number; newCol: number }): void {
    if (this.dragConsumed) {
      this.dragConsumed = false;
      return;
    }
    this.shortcutsService.moveFolder(event.folder.id, event.newRow, event.newCol);
  }

  onFolderRenamed(event: { folder: DesktopFolder; newName: string }): void {
    this.renameFolderTargetId = null;
    this.shortcutsService.renameFolder(event.folder.id, event.newName);
  }

  onFolderRenameCancelled(folder: DesktopFolder): void {
    this.renameFolderTargetId = null;
  }

  onShortcutRemovedFromFolder(event: { folder: DesktopFolder; shortcut: DesktopShortcut }): void {
    this.shortcutsService.removeShortcutFromFolder(event.folder.id, event.shortcut.id);
    // Folder may be auto-deleted if it becomes empty
    if (!this.shortcutsService.folders$.value.some(f => f.id === event.folder.id)) {
      this.openFolderId = null;
    }
  }

  onShortcutDraggedOutOfFolder(event: { folder: DesktopFolder; shortcut: DesktopShortcut; clientX: number; clientY: number }): void {
    const col = Math.min(this.maxGridCols - 1, Math.max(0, Math.floor((event.clientX - this.gridPadding) / this.iconCellWidth)));
    const row = Math.min(this.maxGridRows - 1, Math.max(0, Math.floor((event.clientY - this.gridPadding) / this.iconCellHeight)));
    this.shortcutsService.removeShortcutFromFolderToPosition(event.folder.id, event.shortcut.id, row, col);
    // Folder may be auto-deleted if it becomes empty
    if (!this.shortcutsService.folders$.value.some(f => f.id === event.folder.id)) {
      this.openFolderId = null;
    }
  }

  onShortcutReordered(event: { folder: DesktopFolder; newOrder: DesktopShortcut[] }): void {
    this.shortcutsService.reorderShortcutsInFolder(event.folder.id, event.newOrder);
  }

  // -- Drag-to-create-folder logic --

  private dragConsumed = false;

  /** ID of folder being hovered over during a drag (for visual highlight) */
  dragOverFolderId: string | null = null;

  onIconDragMove(event: { shortcut: DesktopShortcut; clientX: number; clientY: number; deltaX: number; deltaY: number }): void {
    this.dragSourceShortcut = event.shortcut;
    const dragKey = this.getShortcutKey(event.shortcut);
    const isMultiDrag = this.selectedKeys.has(dragKey) && this.selectedKeys.size > 1;

    if (isMultiDrag) {
      this.multiDragDelta = { x: event.deltaX, y: event.deltaY };
      this.multiDragSourceKey = dragKey;
    }

    const hoverCol = Math.floor((event.clientX - this.gridPadding) / this.iconCellWidth);
    const hoverRow = Math.floor((event.clientY - this.gridPadding) / this.iconCellHeight);

    // Check if hovering over an existing folder
    const targetFolder = this.folders.find(f => f.gridRow === hoverRow && f.gridCol === hoverCol);
    if (targetFolder) {
      this.dragOverFolderId = targetFolder.id;
      this.folderPreviewTargetKey = null;
      this.folderPreviewIcons = [];
      return;
    }
    this.dragOverFolderId = null;

    // Skip folder-creation preview during multi-drag
    if (isMultiDrag) {
      this.folderPreviewTargetKey = null;
      this.folderPreviewIcons = [];
      return;
    }

    // Check if hovering over another top-level shortcut
    const target = this.topLevelShortcuts.find(s =>
      s.gridRow === hoverRow && s.gridCol === hoverCol &&
      !(s.gridRow === event.shortcut.gridRow && s.gridCol === event.shortcut.gridCol)
    );

    if (target) {
      const targetKey = this.getShortcutKey(target);
      if (this.folderPreviewTargetKey !== targetKey) {
        this.folderPreviewTargetKey = targetKey;
        // Build preview icons: the target icon + the dragged icon
        const targetPlugin = this.pluginMap.get(target.pluginId);
        const sourcePlugin = this.pluginMap.get(event.shortcut.pluginId);
        this.folderPreviewIcons = [
          { url: target.displayIcon || targetPlugin?.image || null, label: target.displayLabel || targetPlugin?.label || '' },
          { url: event.shortcut.displayIcon || sourcePlugin?.image || null, label: event.shortcut.displayLabel || sourcePlugin?.label || '' }
        ];
      }
    } else {
      this.folderPreviewTargetKey = null;
      this.folderPreviewIcons = [];
    }
  }

  onIconDragEnd(event: { shortcut: DesktopShortcut; clientX: number; clientY: number; deltaX: number; deltaY: number }): void {
    const dragKey = this.getShortcutKey(event.shortcut);
    const isMultiDrag = this.multiDragSourceKey !== null && this.selectedKeys.has(dragKey) && this.selectedKeys.size > 1;

    if (isMultiDrag) {
      if (this.dragOverFolderId) {
        // Add all selected shortcuts to the target folder
        const shortcutIds: string[] = [];
        for (const key of this.selectedKeys) {
          if (!key.startsWith('folder:')) {
            const shortcut = this.topLevelShortcuts.find(s => this.getShortcutKey(s) === key);
            if (shortcut) shortcutIds.push(shortcut.id);
          }
        }
        if (shortcutIds.length > 0) {
          this.shortcutsService.batchAddShortcutsToFolder(this.dragOverFolderId, shortcutIds);
        }
      } else {
        this.batchMoveSelectedItems(event.deltaX, event.deltaY);
      }
      this.dragConsumed = true;
      this.resetMultiDragState();
      return;
    }

    // Dropped on an existing folder -- add the shortcut to it
    if (this.dragOverFolderId && this.dragSourceShortcut) {
      this.shortcutsService.addShortcutToFolder(
        this.dragOverFolderId,
        this.dragSourceShortcut.id
      );
      this.dragConsumed = true;
      this.dragOverFolderId = null;
      this.folderPreviewTargetKey = null;
      this.folderPreviewIcons = [];
      this.dragSourceShortcut = null;
      return;
    }

    // Dropped on another shortcut -- create a new folder from both
    if (this.folderPreviewTargetKey && this.dragSourceShortcut) {
      const target = this.topLevelShortcuts.find(s => this.getShortcutKey(s) === this.folderPreviewTargetKey);
      if (target) {
        const folder = this.shortcutsService.createFolderFromShortcuts(target, this.dragSourceShortcut);
        if (this.shortcutsService.folders$.value.some(f => f.id === folder.id)) {
          this.renameFolderTargetId = folder.id;
        }
      }
      this.dragConsumed = true;
    }
    this.dragOverFolderId = null;
    this.folderPreviewTargetKey = null;
    this.folderPreviewIcons = [];
    this.dragSourceShortcut = null;
  }

  onFolderDragMove(event: { folder: DesktopFolder; clientX: number; clientY: number; deltaX: number; deltaY: number }): void {
    const folderKey = 'folder:' + event.folder.id;
    if (this.selectedKeys.has(folderKey) && this.selectedKeys.size > 1) {
      this.multiDragDelta = { x: event.deltaX, y: event.deltaY };
      this.multiDragSourceKey = folderKey;
    }
  }

  onFolderDragEnd(event: { folder: DesktopFolder; clientX: number; clientY: number; deltaX: number; deltaY: number }): void {
    const folderKey = 'folder:' + event.folder.id;
    const isMultiDrag = this.multiDragSourceKey !== null && this.selectedKeys.has(folderKey) && this.selectedKeys.size > 1;
    if (isMultiDrag) {
      this.batchMoveSelectedItems(event.deltaX, event.deltaY);
      this.dragConsumed = true;
      this.resetMultiDragState();
    }
  }

  getMultiDragDeltaForItem(key: string): {x: number, y: number} | null {
    if (this.multiDragDelta && this.selectedKeys.has(key) && key !== this.multiDragSourceKey) {
      return this.multiDragDelta;
    }
    return null;
  }

  private batchMoveSelectedItems(deltaX: number, deltaY: number): void {
    const deltaCol = Math.round(deltaX / this.iconCellWidth);
    const deltaRow = Math.round(deltaY / this.iconCellHeight);
    if (deltaRow === 0 && deltaCol === 0) return;

    const shortcutMoves: { shortcutId: string; newRow: number; newCol: number }[] = [];
    const folderMoves: { folderId: string; newRow: number; newCol: number }[] = [];
    const newPositions: { row: number; col: number }[] = [];

    for (const key of this.selectedKeys) {
      if (key.startsWith('folder:')) {
        const folder = this.folders.find(f => f.id === key.substring(7));
        if (folder) {
          const newRow = Math.min(this.maxGridRows - 1, Math.max(0, folder.gridRow + deltaRow));
          const newCol = Math.min(this.maxGridCols - 1, Math.max(0, folder.gridCol + deltaCol));
          folderMoves.push({ folderId: folder.id, newRow, newCol });
          newPositions.push({ row: newRow, col: newCol });
        }
      } else {
        const shortcut = this.topLevelShortcuts.find(s => this.getShortcutKey(s) === key);
        if (shortcut) {
          const newRow = Math.min(this.maxGridRows - 1, Math.max(0, shortcut.gridRow + deltaRow));
          const newCol = Math.min(this.maxGridCols - 1, Math.max(0, shortcut.gridCol + deltaCol));
          shortcutMoves.push({ shortcutId: shortcut.id, newRow, newCol });
          newPositions.push({ row: newRow, col: newCol });
        }
      }
    }

    // Check for collisions with non-selected items
    const nonSelected = this.getGridItems().filter(item => {
      const itemKey = item.type === 'folder' ? 'folder:' + item.ref.id : this.getShortcutKey(item.ref);
      return !this.selectedKeys.has(itemKey);
    });
    const hasCollision = newPositions.some(pos =>
      nonSelected.some(item => item.row === pos.row && item.col === pos.col)
    );
    if (hasCollision) return;

    this.shortcutsService.batchMoveItems(shortcutMoves, folderMoves);
  }

  private resetMultiDragState(): void {
    this.multiDragDelta = null;
    this.multiDragSourceKey = null;
    this.dragOverFolderId = null;
    this.folderPreviewTargetKey = null;
    this.folderPreviewIcons = [];
    this.dragSourceShortcut = null;
  }

  onDesktopClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) return;
    if (this.justDefocusedWindow) {
      this.justDefocusedWindow = false;
      return;
    }
    if (this.marqueeJustEnded) {
      this.marqueeJustEnded = false;
      return;
    }
    // When a folder is open, its full-screen overlay handles all click interactions
    if (this.openFolderId) {
      return;
    }
    this.highlightedIconId = null;
    this.highlightedFolderId = null;
    this.selectedKeys.clear();
    this.renameTargetKey = null;
    this.renameFolderTargetId = null;
  }

  // -- Marquee selection --

  onDesktopMouseDown(event: MouseEvent): void {
    // Only start marquee from the desktop background itself (not from icons/windows)
    if (event.target !== event.currentTarget) return;
    if (event.button !== 0) return;
    if (this.windowManager.hasFocusedWindow()) {
      this.windowManager.clearFocusedWindow();
      this.justDefocusedWindow = true;
      return;
    }
    this.marqueeActive = true;
    this.marqueeStartX = event.clientX;
    this.marqueeStartY = event.clientY;
    this.marqueeCurrentX = event.clientX;
    this.marqueeCurrentY = event.clientY;
    if (!event.ctrlKey) {
      this.selectedKeys.clear();
      this.highlightedIconId = null;
      this.highlightedFolderId = null;
    }
    window.addEventListener('mousemove', this.boundMarqueeMove);
    window.addEventListener('mouseup', this.boundMarqueeUp);
  }

  private onMarqueeMouseMove(event: MouseEvent): void {
    this.marqueeCurrentX = event.clientX;
    this.marqueeCurrentY = event.clientY;
    this.updateMarqueeSelection(event.ctrlKey);
  }

  private onMarqueeMouseUp(event: MouseEvent): void {
    window.removeEventListener('mousemove', this.boundMarqueeMove);
    window.removeEventListener('mouseup', this.boundMarqueeUp);
    this.updateMarqueeSelection(event.ctrlKey);
    const wasRealDrag = this.getMarqueeRect().width >= 5 || this.getMarqueeRect().height >= 5;
    this.marqueeActive = false;
    // Fade out the marquee rectangle before removing it from the DOM
    if (wasRealDrag) {
      this.marqueeFadingOut = true;
      if (this.marqueeFadeTimer) clearTimeout(this.marqueeFadeTimer);
      this.marqueeFadeTimer = setTimeout(() => { this.marqueeFadingOut = false; }, 150);
      this.marqueeJustEnded = true;
      setTimeout(() => { this.marqueeJustEnded = false; });
    }
    // Set highlighted to the last selected for keyboard nav continuity
    if (this.selectedKeys.size > 0) {
      const lastKey = Array.from(this.selectedKeys).pop()!;
      if (lastKey.startsWith('folder:')) {
        this.highlightedFolderId = lastKey.substring(7);
        this.highlightedIconId = null;
      } else {
        this.highlightedIconId = lastKey;
        this.highlightedFolderId = null;
      }
    }
  }

  private updateMarqueeSelection(ctrlHeld: boolean): void {
    const rect = this.getMarqueeRect();
    // Too small to be a drag -- don't compute selection yet
    if (rect.width < 5 && rect.height < 5) return;
    // Icon positions are relative to the pane; convert to viewport coords
    const paneBounds = this.elementRef.nativeElement.querySelector('.window-pane')?.getBoundingClientRect()
      || { left: 0, top: 0 };
    const newKeys = new Set<string>();
    // Check shortcuts
    for (const s of this.topLevelShortcuts) {
      const cx = paneBounds.left + this.gridPadding + s.gridCol * this.iconCellWidth + this.iconCellWidth / 2;
      const cy = paneBounds.top + this.gridPadding + s.gridRow * this.iconCellHeight + this.iconCellHeight / 2;
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
        newKeys.add(this.getShortcutKey(s));
      }
    }
    // Check folders
    for (const f of this.folders) {
      const cx = paneBounds.left + this.gridPadding + f.gridCol * this.iconCellWidth + this.iconCellWidth / 2;
      const cy = paneBounds.top + this.gridPadding + f.gridRow * this.iconCellHeight + this.iconCellHeight / 2;
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
        newKeys.add('folder:' + f.id);
      }
    }
    if (ctrlHeld) {
      // Ctrl+marquee: add to existing selection
      newKeys.forEach(k => this.selectedKeys.add(k));
    } else {
      this.selectedKeys = newKeys;
    }
  }

  getMarqueeRect(): { left: number; top: number; right: number; bottom: number; width: number; height: number } {
    const left = Math.min(this.marqueeStartX, this.marqueeCurrentX);
    const top = Math.min(this.marqueeStartY, this.marqueeCurrentY);
    const right = Math.max(this.marqueeStartX, this.marqueeCurrentX);
    const bottom = Math.max(this.marqueeStartY, this.marqueeCurrentY);
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  get marqueeStyle(): { [key: string]: string } {
    const r = this.getMarqueeRect();
    return {
      left: r.left + 'px',
      top: r.top + 'px',
      width: r.width + 'px',
      height: r.height + 'px'
    };
  }

  onPropertiesClosed(): void {
    this.propertiesShortcut = null;
  }

  onPropertiesIconChanged(event: { shortcut: DesktopShortcut; iconUrl: string | undefined }): void {
    this.shortcutsService.updateShortcutIcon(event.shortcut.id, event.iconUrl);
  }

  onPropertiesLaunchMetadataChanged(event: { shortcut: DesktopShortcut; launchMetadata: any }): void {
    this.shortcutsService.updateShortcutLaunchMetadata(event.shortcut.id, event.launchMetadata);
  }

  onDesktopRightClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    event.stopPropagation();
    const menuItems: ContextMenuItem[] = [];
    if (this.shortcutsService.canUndoDelete) {
      menuItems.push({
        text: this.translation.translate('Undo Delete'),
        action: () => this.shortcutsService.undoLastDelete()
      });
    }
    menuItems.push({
      text: this.translation.translate('New Folder'),
      action: () => this.createDesktopFolder(event.clientX, event.clientY)
    });
    this.windowManager.contextMenuRequested.next({
      xPos: event.clientX,
      yPos: event.clientY,
      items: menuItems
    });
  }

  private createDesktopFolder(clientX: number, clientY: number): void {
    const col = Math.min(this.maxGridCols - 1, Math.max(0, Math.floor((clientX - this.gridPadding) / this.iconCellWidth)));
    const row = Math.min(this.maxGridRows - 1, Math.max(0, Math.floor((clientY - this.gridPadding) / this.iconCellHeight)));
    // Don't create a folder on a cell already occupied by a shortcut or another folder
    const occupied = this.topLevelShortcuts.some(s => s.gridRow === row && s.gridCol === col)
      || this.folders.some(f => f.gridRow === row && f.gridCol === col);
    if (occupied) return;
    const folder = this.shortcutsService.createFolder(this.shortcutsService.getUniqueFolderName('New Folder'), row, col, []);
    if (this.shortcutsService.folders$.value.some(f => f.id === folder.id)) {
      this.renameFolderTargetId = folder.id;
    }
  }

  ngOnInit(): void {
    this.updateGridDimensions();
    this.windowManager.contextMenuRequested.subscribe(menuDef => {
      this.contextMenuDef = menuDef;
    });

    // TODO: The wallpaper change is not working properly. The wallpaper is not updated after changing it in the settings.
    // It needs refresh to see the new wallpaper. The solutions that I have tried:
    // 1. Adding delay before calling the replaceWallpaper function.
    // 2. Using different HTTP methods (GET, POST, PUT) to update the wallpaper.
    // 3. Checked for browser caching issues by adding cache-control headers.
    // 4. Verified the server-side implementation to ensure it correctly handles the wallpaper update.
    // None of these solutions worked.
    // Further investigation is needed to identify the root cause and implement a proper fix.

    this.themeService.onWallpaperChange
      .subscribe((image:any) => {
        let temp = this.wallpaper.background;
        this.resetWallpaperDefault();
        this.http.put<DesktopTheme>(DESKTOP_WALLPAPER_URI, image)
          .pipe(delay(250))
          .subscribe((data: any) => { 
            this.resetWallpaperDefault();
            this.logger.debug("Attempted to post image with status: ", data);
            this.replaceWallpaper(DESKTOP_WALLPAPER_URI);
          },
          (error: any) => {
            this.wallpaper.background = temp;
            const notifTitle = this.translation.translate("Personalization");
            let notifMessage;
            if (error.status === 413) //payload too large
            { // Needs translations
              notifMessage = `Wallpaper changed failed: Server supports a max size of '` + DESKTOP_WALLPAPER_MAX_SIZE + `' mb.`;
            } else {
              notifMessage = `Wallpaper changed failed - ` + error.status + `: ` + error.message;
            }
            ZoweZLUX.notificationManager.notify(ZoweZLUX.notificationManager.createNotification(notifTitle, notifMessage, 1, "org.zowe.zlux.ng2desktop.settings"));
          } );
      });

    this.themeService.onResetAllDefault
      .subscribe(() => {
        this.resetWallpaperDefault();
        this.http.delete<DesktopTheme>(DESKTOP_WALLPAPER_URI)
          .subscribe((data: any) => { 
            this.logger.debug("Attempted to delete image with status: ", data);
            this.replaceWallpaper(DESKTOP_WALLPAPER_URI);
          });
      });
  }

  closeContextMenu(): void {
    this.contextMenuDef = null;
  }

  resetWallpaperDefault(): void {
    this.wallpaper.background = '';
  }

  get windows(): DesktopWindow[] {
    return this.windowManager.getAllWindows();
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.propertiesShortcut) {
      this.propertiesShortcut = null;
    } else if (this.openFolderId) {
      this.openFolderId = null;
    } else if (this.selectedKeys.size > 0 || this.highlightedIconId || this.highlightedFolderId) {
      this.selectedKeys.clear();
      this.highlightedIconId = null;
      this.highlightedFolderId = null;
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Only handle when no window has focus and no modal is open
    if (this.propertiesShortcut || this.renameTargetKey || this.renameFolderTargetId) return;
    // Don't intercept when an input/textarea has focus
    const tag = (event.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    // Delegate to open folder's keyboard handler
    if (this.openFolderId) {
      const folderComp = this.folderComponents?.find(fc => fc.folder?.id === this.openFolderId);
      if (folderComp?.handleExpandedKeydown(event.key)) {
        event.preventDefault();
      }
      return;
    }
    // Don't intercept when a window has focus
    if (this.windowManager.getAllWindows().some(w => this.windowManager.windowHasFocus(w.windowId))) return;

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        event.preventDefault();
        this.navigateGrid(event.key, event.ctrlKey || event.metaKey);
        break;
      case 'Enter':
        event.preventDefault();
        this.openHighlightedItem();
        break;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        this.deleteSelectedItems();
        break;
      case 'F2':
        event.preventDefault();
        this.renameHighlightedItem();
        break;
      case 'a':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.selectAllItems();
        }
        break;
      case 'z':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.shortcutsService.undoLastDelete();
        }
        break;
    }
  }

  private navigateGrid(direction: string, ctrlKey: boolean = false): void {
    const allItems = this.getGridItems();
    if (allItems.length === 0) return;

    // Find the currently highlighted item
    let currentRow = -1;
    let currentCol = -1;
    const highlightedShortcut = this.highlightedIconId
      ? this.topLevelShortcuts.find(s => this.getShortcutKey(s) === this.highlightedIconId)
      : null;
    const highlightedFolder = this.highlightedFolderId
      ? this.folders.find(f => f.id === this.highlightedFolderId)
      : null;

    if (highlightedShortcut) {
      currentRow = highlightedShortcut.gridRow;
      currentCol = highlightedShortcut.gridCol;
    } else if (highlightedFolder) {
      currentRow = highlightedFolder.gridRow;
      currentCol = highlightedFolder.gridCol;
    } else {
      // Nothing selected -- select the first item (top-left)
      const first = allItems.sort((a, b) => a.col !== b.col ? a.col - b.col : a.row - b.row)[0];
      this.selectGridItem(first, false);
      return;
    }

    let dRow = 0, dCol = 0;
    switch (direction) {
      case 'ArrowUp':    dRow = -1; break;
      case 'ArrowDown':  dRow = 1;  break;
      case 'ArrowLeft':  dCol = -1; break;
      case 'ArrowRight': dCol = 1;  break;
    }

    // Search in the direction for the nearest item
    let bestItem: { row: number; col: number; type: string; ref: any } | null = null;
    let bestDist = Infinity;
    for (const item of allItems) {
      if (item.row === currentRow && item.col === currentCol) continue;
      const dr = item.row - currentRow;
      const dc = item.col - currentCol;
      // Must be in the correct direction
      if (dRow !== 0 && Math.sign(dr) !== dRow) continue;
      if (dCol !== 0 && Math.sign(dc) !== dCol) continue;
      // For vertical movement, prefer same column; for horizontal, prefer same row
      const primaryDist = dRow !== 0 ? Math.abs(dr) : Math.abs(dc);
      const secondaryDist = dRow !== 0 ? Math.abs(dc) : Math.abs(dr);
      const dist = primaryDist * 1000 + secondaryDist;
      if (dist < bestDist) {
        bestDist = dist;
        bestItem = item;
      }
    }
    if (bestItem) {
      this.selectGridItem(bestItem, ctrlKey);
    }
  }

  private getGridItems(): { row: number; col: number; type: string; ref: any }[] {
    const items: { row: number; col: number; type: string; ref: any }[] = [];
    for (const s of this.topLevelShortcuts) {
      items.push({ row: s.gridRow, col: s.gridCol, type: 'shortcut', ref: s });
    }
    for (const f of this.folders) {
      items.push({ row: f.gridRow, col: f.gridCol, type: 'folder', ref: f });
    }
    return items;
  }

  private selectGridItem(item: { row: number; col: number; type: string; ref: any }, ctrlKey: boolean = false): void {
    if (!ctrlKey) {
      this.selectedKeys.clear();
    }
    if (item.type === 'shortcut') {
      const key = this.getShortcutKey(item.ref);
      this.highlightedIconId = key;
      this.highlightedFolderId = null;
      if (ctrlKey && this.selectedKeys.has(key)) {
        this.selectedKeys.delete(key);
      } else {
        this.selectedKeys.add(key);
      }
    } else {
      this.highlightedFolderId = item.ref.id;
      this.highlightedIconId = null;
      const key = 'folder:' + item.ref.id;
      if (ctrlKey && this.selectedKeys.has(key)) {
        this.selectedKeys.delete(key);
      } else {
        this.selectedKeys.add(key);
      }
    }
  }

  /** Open only the currently highlighted (focused) item -- not the entire selection.
   *  This matches Windows 11 behavior: selection is for batch delete/move, Enter opens the focused item. */
  private openHighlightedItem(): void {
    if (this.highlightedIconId) {
      const shortcut = this.topLevelShortcuts.find(s => this.getShortcutKey(s) === this.highlightedIconId);
      if (shortcut) { this.onIconLaunched(shortcut); }
    } else if (this.highlightedFolderId) {
      const folder = this.folders.find(f => f.id === this.highlightedFolderId);
      if (folder) { this.onFolderOpened(folder); }
    }
  }

  private deleteSelectedItems(): void {
    const keysToDelete = this.selectedKeys.size > 0
      ? new Set(this.selectedKeys)
      : this.highlightedIconId
        ? new Set([this.highlightedIconId])
        : this.highlightedFolderId
          ? new Set(['folder:' + this.highlightedFolderId])
          : null;
    if (!keysToDelete || keysToDelete.size === 0) return;
    const shortcutIds: string[] = [];
    const folderIds: string[] = [];
    for (const key of keysToDelete) {
      if (key.startsWith('folder:')) {
        folderIds.push(key.substring(7));
      } else {
        const shortcut = this.topLevelShortcuts.find(s => this.getShortcutKey(s) === key);
        if (shortcut) {
          shortcutIds.push(shortcut.id);
        }
      }
    }
    if (shortcutIds.length > 0 || folderIds.length > 0) {
      this.shortcutsService.batchDeleteItems(shortcutIds, folderIds);
    }
    this.selectedKeys.clear();
    this.highlightedIconId = null;
    this.highlightedFolderId = null;
  }

  private renameHighlightedItem(): void {
    if (this.highlightedIconId) {
      this.renameTargetKey = this.highlightedIconId;
    } else if (this.highlightedFolderId) {
      this.renameFolderTargetId = this.highlightedFolderId;
    }
  }

  private selectAllItems(): void {
    this.selectedKeys.clear();
    for (const s of this.topLevelShortcuts) {
      this.selectedKeys.add(this.getShortcutKey(s));
    }
    for (const f of this.folders) {
      this.selectedKeys.add('folder:' + f.id);
    }
  }

  private loadPinnedPluginIds(): void {
    const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), 'user', 'ui/launchbar/plugins', 'pinnedPlugins.json'
    );
    this.http.get<any>(uri, { observe: 'response' }).subscribe(res => {
      if (res.status !== 204 && res.body?.contents?.plugins) {
        this.pinnedPluginIds = new Set(res.body.contents.plugins);
      } else {
        this.pinnedPluginIds = new Set();
      }
    }, () => {
      this.pinnedPluginIds = new Set();
    });
  }

  private togglePinToLaunchbar(pluginId: string, pin: boolean): void {
    const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), 'user', 'ui/launchbar/plugins', 'pinnedPlugins.json'
    );
    this.http.get<any>(uri, { observe: 'response' }).subscribe(res => {
      let plugins: string[] = (res.status === 204) ? [] : (res.body?.contents?.plugins || []);
      if (pin) {
        if (!plugins.includes(pluginId)) {
          plugins.push(pluginId);
        }
      } else {
        plugins = plugins.filter(p => p !== pluginId);
      }
      this.http.put(uri, { plugins }).subscribe(() => {
        this.pinnedPluginIds = new Set(plugins);
        window.dispatchEvent(new CustomEvent('zlux_desktop-pinned-plugins-changed'));
      });
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = setTimeout(() => {
      this.updateGridDimensions();
      this.reflowOutOfBoundsIcons();
    }, 200);
  }

  ngOnDestroy(): void {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
  }

  private applyIconSize(sizeValue: number): void {
    switch (sizeValue) {
      case 1: // small
        this.iconCellWidth = 70;
        this.iconCellHeight = 70;
        this.iconImageSize = 32;
        this.iconFontSize = 10;
        this.iconLetterSize = 16;
        this.gridPadding = 8;
        break;
      case 3: // large
        this.iconCellWidth = 120;
        this.iconCellHeight = 120;
        this.iconImageSize = 64;
        this.iconFontSize = 13;
        this.iconLetterSize = 28;
        this.gridPadding = 12;
        break;
      default: // medium (2)
        this.iconCellWidth = 90;
        this.iconCellHeight = 90;
        this.iconImageSize = 48;
        this.iconFontSize = 11;
        this.iconLetterSize = 22;
        this.gridPadding = 10;
    }
    this.updateGridDimensions();
    this.reflowOutOfBoundsIcons();
  }

  /** Pixel height of the launchbar based on its size setting */
  private getLaunchbarHeight(): number {
    switch (this.launchbarSize) {
      case 1: return 25;
      case 3: return 76;
      default: return 41; // medium (2)
    }
  }

  private updateGridDimensions(): void {
    const launchbarHeight = this.getLaunchbarHeight();
    this.maxGridCols = Math.max(1, Math.floor((window.innerWidth - this.gridPadding) / this.iconCellWidth));
    this.maxGridRows = Math.max(1, Math.floor((window.innerHeight - this.gridPadding - launchbarHeight) / this.iconCellHeight));
    // Keep the service in sync so new shortcuts are placed within the visible grid
    this.shortcutsService.updateGridLimits(this.maxGridRows, this.maxGridCols);
  }

  private reflowOutOfBoundsIcons(): void {
    let updatedShortcuts = [...this.shortcuts];
    let shortcutsChanged = false;
    let updatedFolders = [...this.folders];
    let foldersChanged = false;

    // Build a shared occupied set for both shortcuts and folders
    const occupied = new Set([
      ...updatedShortcuts.filter(s => !s.folderId).map(s => `${s.gridRow},${s.gridCol}`),
      ...updatedFolders.map(f => `${f.gridRow},${f.gridCol}`)
    ]);

    // Reflow out-of-bounds shortcuts
    for (let i = 0; i < updatedShortcuts.length; i++) {
      const s = updatedShortcuts[i];
      if (!s.folderId && (s.gridRow >= this.maxGridRows || s.gridCol >= this.maxGridCols)) {
        occupied.delete(`${s.gridRow},${s.gridCol}`);
        const pos = this.findNearestAvailablePosition(s.gridRow, s.gridCol, occupied);
        updatedShortcuts[i] = { ...s, gridRow: pos.row, gridCol: pos.col };
        occupied.add(`${pos.row},${pos.col}`);
        shortcutsChanged = true;
      }
    }

    // Reflow out-of-bounds folders (using the same occupied set, now updated with reflowed shortcuts)
    for (let i = 0; i < updatedFolders.length; i++) {
      const f = updatedFolders[i];
      if (f.gridRow >= this.maxGridRows || f.gridCol >= this.maxGridCols) {
        occupied.delete(`${f.gridRow},${f.gridCol}`);
        const pos = this.findNearestAvailablePosition(f.gridRow, f.gridCol, occupied);
        updatedFolders[i] = { ...f, gridRow: pos.row, gridCol: pos.col };
        occupied.add(`${pos.row},${pos.col}`);
        foldersChanged = true;
      }
    }

    // Single atomic save if either changed
    if (shortcutsChanged || foldersChanged) {
      this.shortcutsService.saveAll(
        shortcutsChanged ? updatedShortcuts : this.shortcuts,
        foldersChanged ? updatedFolders : this.folders
      );
    }
  }

  /** Find the closest in-bounds unoccupied cell to the given position using Manhattan distance */
  private findNearestAvailablePosition(fromRow: number, fromCol: number, occupied: Set<string>): { row: number; col: number } {
    const clampedRow = Math.min(fromRow, this.maxGridRows - 1);
    const clampedCol = Math.min(fromCol, this.maxGridCols - 1);
    if (!occupied.has(`${clampedRow},${clampedCol}`)) {
      return { row: clampedRow, col: clampedCol };
    }
    // Spiral outward from clamped position by increasing Manhattan distance
    const maxDist = this.maxGridRows + this.maxGridCols;
    for (let dist = 1; dist <= maxDist; dist++) {
      for (let dRow = -dist; dRow <= dist; dRow++) {
        const dCol = dist - Math.abs(dRow);
        for (const dc of (dCol === 0 ? [0] : [-dCol, dCol])) {
          const r = clampedRow + dRow;
          const c = clampedCol + dc;
          if (r >= 0 && r < this.maxGridRows && c >= 0 && c < this.maxGridCols && !occupied.has(`${r},${c}`)) {
            return { row: r, col: c };
          }
        }
      }
    }
    return { row: 0, col: 0 };
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

