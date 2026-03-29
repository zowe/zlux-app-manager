

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, OnDestroy, Injector, Input, HostListener } from '@angular/core';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { DesktopTheme } from "../desktop/desktop.component";
import { HttpClient, HttpResponse } from '@angular/common/http';
import { DesktopWindow } from '../shared/desktop-window';
import { WindowManagerService } from '../shared/window-manager.service';
import { BaseLogger } from 'virtual-desktop-logger';
import { ThemeEmitterService } from '../services/theme-emitter.service';
import { DesktopShortcut, DesktopFolder, DesktopShortcutsService } from '../services/desktop-shortcuts.service';
import { DesktopPluginDefinitionImpl } from '../../../plugin-manager/shared/desktop-plugin-definition';
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

  @Input() set theme(newTheme: DesktopTheme) {
    this._theme = newTheme;
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
  renameFolderTargetId: string | null = null;
  folderPreviewTargetKey: string | null = null;
  folderPreviewIcons: { url: string | null; label: string }[] = [];
  private dragSourceShortcut: DesktopShortcut | null = null;
  maxGridRows: number = 8;
  maxGridCols: number = 20;
  iconCellWidth: number = 90;
  iconCellHeight: number = 90;
  iconImageSize: number = 48;
  iconFontSize: number = 11;
  iconLetterSize: number = 22;
  gridPadding: number = 10;
  private resizeTimer: any = null;

  constructor(
    public windowManager: WindowManagerService,
    private injector: Injector,
    private http: HttpClient,
    private themeService: ThemeEmitterService,
    private translation: L10nTranslationService,
    public shortcutsService: DesktopShortcutsService
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

    // Listen for external shortcut changes (e.g. from ZFM plugin)
    window.addEventListener('desktop-shortcuts-changed', () => {
      this.shortcutsService.loadShortcuts();
    });

    // Listen for editor saving a new file created from a desktop shortcut
    window.addEventListener('desktop-new-file-saved', ((event: CustomEvent) => {
      const { originalName, filePath } = event.detail;
      if (originalName && filePath) {
        this.shortcutsService.convertNewFileShortcut(originalName, filePath);
      }
    }) as EventListener);

    // Listen for folder open requests from the taskbar
    window.addEventListener('desktop-open-folder', ((event: CustomEvent) => {
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
      this.applyIconSize(size.windowSize || 2);
    });
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
    return true;
  }

  getPluginForShortcut(shortcut: DesktopShortcut): DesktopPluginDefinitionImpl | undefined {
    return this.pluginMap.get(shortcut.pluginId);
  }

  onIconSelected(shortcut: DesktopShortcut): void {
    this.highlightedIconId = shortcut.pluginId + (shortcut.action?.id || '');
  }

  getShortcutKey(shortcut: DesktopShortcut): string {
    return shortcut.pluginId + (shortcut.action?.id || '');
  }

  onIconLaunched(shortcut: DesktopShortcut): void {
    const plugin = this.pluginMap.get(shortcut.pluginId);
    this.shortcutsService.invokeShortcut(shortcut, this.applicationManager, plugin);
  }

  onIconContextMenu(event: { event: MouseEvent; shortcut: DesktopShortcut }): void {
    const shortcut = event.shortcut;
    const plugin = this.pluginMap.get(shortcut.pluginId);
    const menuItems: ContextMenuItem[] = [
      {
        text: 'Open',
        action: () => this.onIconLaunched(shortcut)
      },
      {
        text: 'Open in New Browser Tab',
        action: () => this.openShortcutInNewTab(shortcut, plugin)
      },
      {
        text: 'Rename',
        action: () => this.startIconRename(shortcut)
      },
      {
        text: 'Remove From Desktop',
        action: () => this.shortcutsService.removeShortcutAtPosition(shortcut.gridRow, shortcut.gridCol)
      }
    ];
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
    this.shortcutsService.moveShortcut(event.shortcut.pluginId, event.newRow, event.newCol, event.shortcut.action?.id);
  }

  onIconRenamed(event: { shortcut: DesktopShortcut; newLabel: string }): void {
    this.renameTargetKey = null;
    const updateActionName = event.shortcut.action?.launchMetadata?.data?.type === 'newFile';
    this.shortcutsService.renameShortcut(event.shortcut.gridRow, event.shortcut.gridCol, event.newLabel, updateActionName);
  }

  onIconRenameCancelled(shortcut: DesktopShortcut): void {
    this.renameTargetKey = null;
    if (shortcut.action?.launchMetadata?.data?.type === 'newFile' && shortcut.displayLabel === 'New File') {
      this.shortcutsService.removeShortcutAtPosition(shortcut.gridRow, shortcut.gridCol);
    }
  }

  private startIconRename(shortcut: DesktopShortcut): void {
    this.renameTargetKey = this.getShortcutKey(shortcut);
  }

  private openShortcutInNewTab(shortcut: DesktopShortcut, plugin?: DesktopPluginDefinitionImpl): void {
    const targetPluginId = shortcut.action?.targetPluginId || shortcut.pluginId;
    const targetPlugin = this.pluginMap.get(targetPluginId);
    if (targetPlugin) {
      const pluginType = targetPlugin.getFramework();
      if (pluginType === 'iframe' && !(targetPlugin as any).standaloneUseFramework) {
        const webContent = targetPlugin.getBasePlugin().getWebContent();
        if (webContent.destination > '') {
          window.open(`${location.origin}${ZoweZLUX.uriBroker.pluginIframeUri(targetPlugin.getBasePlugin(), '')}`);
        } else {
          window.open(`${location.origin}${ZoweZLUX.uriBroker.pluginResourceUri(targetPlugin.getBasePlugin(), webContent.startingPage)}`);
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

  // ── Folder event handlers ──

  onFolderSelected(folder: DesktopFolder): void {
    this.highlightedFolderId = folder.id;
    this.highlightedIconId = null;
  }

  onFolderOpened(folder: DesktopFolder): void {
    if (this.openFolderId === folder.id) {
      this.openFolderId = null;
    } else {
      this.openFolderId = folder.id;
      this.shortcutsService.markFolderOpened(folder.id);
    }
  }

  onFolderContextMenu(event: { event: MouseEvent; folder: DesktopFolder }): void {
    const folder = event.folder;
    const isPinned = this.shortcutsService.isFolderPinned(folder.id);
    const menuItems: ContextMenuItem[] = [
      {
        text: 'Open Folder',
        action: () => this.onFolderOpened(folder)
      },
      {
        text: 'Rename',
        action: () => { this.renameFolderTargetId = folder.id; }
      },
      {
        text: isPinned ? 'Unpin from Taskbar' : 'Pin to Taskbar',
        action: () => isPinned ? this.shortcutsService.unpinFolder(folder.id) : this.shortcutsService.pinFolder(folder.id)
      },
      {
        text: 'Delete Folder',
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
    this.shortcutsService.removeShortcutFromFolder(event.folder.id, event.shortcut.gridRow, event.shortcut.gridCol);
    if (!this.folders.some(f => f.id === event.folder.id)) {
      this.openFolderId = null;
    }
  }

  onShortcutDraggedOutOfFolder(event: { folder: DesktopFolder; shortcut: DesktopShortcut; clientX: number; clientY: number }): void {
    const col = Math.min(this.maxGridCols - 1, Math.max(0, Math.floor((event.clientX - this.gridPadding) / this.iconCellWidth)));
    const row = Math.min(this.maxGridRows - 1, Math.max(0, Math.floor((event.clientY - this.gridPadding) / this.iconCellHeight)));
    this.shortcutsService.removeShortcutFromFolderToPosition(event.folder.id, event.shortcut.gridRow, event.shortcut.gridCol, row, col);
    if (!this.folders.some(f => f.id === event.folder.id)) {
      this.openFolderId = null;
    }
  }

  onShortcutReordered(event: { folder: DesktopFolder; newOrder: DesktopShortcut[] }): void {
    this.shortcutsService.reorderShortcutsInFolder(event.folder.id, event.newOrder);
  }

  // ── Drag-to-create-folder logic ──

  private dragConsumed = false;

  /** ID of folder being hovered over during a drag (for visual highlight) */
  dragOverFolderId: string | null = null;

  onIconDragMove(event: { shortcut: DesktopShortcut; clientX: number; clientY: number }): void {
    this.dragSourceShortcut = event.shortcut;
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

  onIconDragEnd(event: { shortcut: DesktopShortcut; clientX: number; clientY: number }): void {
    // Dropped on an existing folder — add the shortcut to it
    if (this.dragOverFolderId && this.dragSourceShortcut) {
      this.shortcutsService.addShortcutToFolder(
        this.dragOverFolderId,
        this.dragSourceShortcut.gridRow,
        this.dragSourceShortcut.gridCol
      );
      this.dragConsumed = true;
      this.dragOverFolderId = null;
      this.folderPreviewTargetKey = null;
      this.folderPreviewIcons = [];
      this.dragSourceShortcut = null;
      return;
    }

    // Dropped on another shortcut — create a new folder from both
    if (this.folderPreviewTargetKey && this.dragSourceShortcut) {
      const target = this.topLevelShortcuts.find(s => this.getShortcutKey(s) === this.folderPreviewTargetKey);
      if (target) {
        const folder = this.shortcutsService.createFolderFromShortcuts(target, this.dragSourceShortcut);
        // Auto-rename after creation
        setTimeout(() => { this.renameFolderTargetId = folder.id; }, 200);
      }
      this.dragConsumed = true;
    }
    this.dragOverFolderId = null;
    this.folderPreviewTargetKey = null;
    this.folderPreviewIcons = [];
    this.dragSourceShortcut = null;
  }

  onDesktopClick(): void {
    this.highlightedIconId = null;
    this.highlightedFolderId = null;
    this.renameTargetKey = null;
    this.renameFolderTargetId = null;
    this.openFolderId = null;
  }

  onDesktopRightClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const menuItems: ContextMenuItem[] = [];
    menuItems.push({
      text: 'New Folder',
      action: () => this.createDesktopFolder(event.clientX, event.clientY)
    });
    if (this.pluginMap.has('org.zowe.editor')) {
      menuItems.push({
        text: 'Create New File',
        action: () => this.createNewFileShortcut()
      });
    }
    this.windowManager.contextMenuRequested.next({
      xPos: event.clientX,
      yPos: event.clientY,
      items: menuItems
    });
  }

  private createDesktopFolder(clientX: number, clientY: number): void {
    const col = Math.min(this.maxGridCols - 1, Math.max(0, Math.floor((clientX - this.gridPadding) / this.iconCellWidth)));
    const row = Math.min(this.maxGridRows - 1, Math.max(0, Math.floor((clientY - this.gridPadding) / this.iconCellHeight)));
    const folder = this.shortcutsService.createFolder('New Folder', row, col, []);
    setTimeout(() => { this.renameFolderTargetId = folder.id; }, 200);
  }

  private createNewFileShortcut(): void {
    this.http.get<any>(ZoweZLUX.uriBroker.userInfoUri()).subscribe(
      (resp) => {
        const homeDir = resp?.home?.trim() || '/';
        this.createNewFileShortcutWithDir(homeDir);
      },
      () => {
        this.createNewFileShortcutWithDir('/');
      }
    );
  }

  private createNewFileShortcutWithDir(directory: string): void {
    const defaultLabel = 'New File';
    const actionData = { targetPluginId: 'org.zowe.editor', type: 'newFile', name: defaultLabel };
    const shortcut: DesktopShortcut = {
      pluginId: 'org.zowe.editor',
      gridRow: 0,
      gridCol: 0,
      displayLabel: defaultLabel,
      displayIcon: ZoweZLUX.uriBroker.pluginResourceUri(DESKTOP_PLUGIN, 'assets/images/new-file.svg'),
      action: {
        id: DesktopShortcutsService.generateActionId('org.zowe.editor', actionData),
        name: 'Open New File in Editor',
        targetPluginId: 'org.zowe.editor',
        targetMode: 'PluginCreate',
        type: 'Message',
        primaryArgument: { data: { op: 'deref', source: 'event', path: ['data'] } },
        launchMetadata: { data: { type: 'newFile', name: defaultLabel, directory: directory } }
      }
    };
    this.shortcutsService.addActionShortcut(shortcut);
    // Wait for the shortcut to appear then trigger rename
    setTimeout(() => {
      const created = this.shortcuts.find(s =>
        s.action?.launchMetadata?.data?.type === 'newFile' && s.displayLabel === defaultLabel
      );
      if (created) {
        this.renameTargetKey = this.getShortcutKey(created);
      }
    }, 200);
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
            if (error.status = 413) //payload too large
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

  private updateGridDimensions(): void {
    this.maxGridCols = Math.max(1, Math.floor((window.innerWidth - this.gridPadding) / this.iconCellWidth));
    this.maxGridRows = Math.max(1, Math.floor((window.innerHeight - this.gridPadding) / this.iconCellHeight));
  }

  private reflowOutOfBoundsIcons(): void {
    const current = this.shortcuts;
    let shortcutsNeedsSave = false;
    if (current && current.length > 0) {
      const updated = [...current];
      const occupied = new Set([
        ...updated.filter(s => !s.folderId).map(s => `${s.gridRow},${s.gridCol}`),
        ...this.folders.map(f => `${f.gridRow},${f.gridCol}`)
      ]);
      for (let i = 0; i < updated.length; i++) {
        const s = updated[i];
        if (!s.folderId && (s.gridRow >= this.maxGridRows || s.gridCol >= this.maxGridCols)) {
          occupied.delete(`${s.gridRow},${s.gridCol}`);
          const pos = this.findNearestAvailablePosition(s.gridRow, s.gridCol, occupied);
          updated[i] = { ...s, gridRow: pos.row, gridCol: pos.col };
          occupied.add(`${pos.row},${pos.col}`);
          shortcutsNeedsSave = true;
        }
      }
      if (shortcutsNeedsSave) {
        this.shortcutsService.saveShortcutsDirect(updated);
      }
    }

    // Also reflow folders
    const currentFolders = this.folders;
    if (currentFolders && currentFolders.length > 0) {
      let foldersNeedsSave = false;
      const updatedFolders = [...currentFolders];
      const occupiedAfter = new Set([
        ...this.topLevelShortcuts.map(s => `${s.gridRow},${s.gridCol}`),
        ...updatedFolders.map(f => `${f.gridRow},${f.gridCol}`)
      ]);
      for (let i = 0; i < updatedFolders.length; i++) {
        const f = updatedFolders[i];
        if (f.gridRow >= this.maxGridRows || f.gridCol >= this.maxGridCols) {
          occupiedAfter.delete(`${f.gridRow},${f.gridCol}`);
          const pos = this.findNearestAvailablePosition(f.gridRow, f.gridCol, occupiedAfter);
          updatedFolders[i] = { ...f, gridRow: pos.row, gridCol: pos.col };
          occupiedAfter.add(`${pos.row},${pos.col}`);
          foldersNeedsSave = true;
        }
      }
      if (foldersNeedsSave) {
        this.shortcutsService.saveFoldersDirect(updatedFolders);
      }
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

