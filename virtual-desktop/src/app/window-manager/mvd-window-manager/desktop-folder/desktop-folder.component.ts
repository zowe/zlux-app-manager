/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { DesktopFolder, DesktopShortcut } from '../services/desktop-shortcuts.service';
import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';

const DRAG_THRESHOLD = 5;
const FOLDER_GRID_SIZE = 2; // 2x2 grid of child icons in the folder preview

@Component({
  selector: 'rs-com-desktop-folder',
  templateUrl: './desktop-folder.component.html',
  styleUrls: ['./desktop-folder.component.css']
})
export class DesktopFolderComponent {
  @Input() folder: DesktopFolder;
  @Input() childShortcuts: DesktopShortcut[] = [];
  @Input() pluginMap: Map<string, DesktopPluginDefinitionImpl> = new Map();
  @Input() isHighlighted: boolean = false;
  @Input() isOpen: boolean = false;
  @Input() allFolders: DesktopFolder[] = [];
  @Input() allShortcuts: DesktopShortcut[] = [];
  @Input() maxGridRows: number = 20;
  @Input() maxGridCols: number = 20;
  @Input() iconCellWidth: number = 90;
  @Input() iconCellHeight: number = 90;
  @Input() iconImageSize: number = 48;
  @Input() iconFontSize: number = 11;
  @Input() iconLetterSize: number = 22;
  @Input() gridPadding: number = 10;
  @Input() set shouldRename(value: boolean) {
    if (value && !this.isRenaming) {
      this.startRename();
    }
  }

  @Output() folderSelected = new EventEmitter<DesktopFolder>();
  @Output() folderClicked = new EventEmitter<{ folder: DesktopFolder; ctrlKey: boolean }>();
  @Output() folderOpened = new EventEmitter<DesktopFolder>();
  @Output() folderContextMenu = new EventEmitter<{ event: MouseEvent; folder: DesktopFolder }>();
  @Output() folderMoved = new EventEmitter<{ folder: DesktopFolder; newRow: number; newCol: number }>();
  @Output() folderRenamed = new EventEmitter<{ folder: DesktopFolder; newName: string }>();
  @Output() folderRenameCancelled = new EventEmitter<DesktopFolder>();
  @Output() shortcutLaunched = new EventEmitter<DesktopShortcut>();
  @Output() shortcutRemovedFromFolder = new EventEmitter<{ folder: DesktopFolder; shortcut: DesktopShortcut }>();
  @Output() shortcutDroppedOnFolder = new EventEmitter<{ folder: DesktopFolder }>();
  @Output() shortcutDraggedOutToDesktop = new EventEmitter<{ folder: DesktopFolder; shortcut: DesktopShortcut; clientX: number; clientY: number }>();
  @Output() shortcutReordered = new EventEmitter<{ folder: DesktopFolder; newOrder: DesktopShortcut[] }>();
  @Output() shortcutContextMenu = new EventEmitter<{ event: MouseEvent; shortcut: DesktopShortcut }>();

  @ViewChild('renameInput') renameInputRef: ElementRef<HTMLInputElement>;
  @ViewChild('expandedPanel') expandedPanelRef: ElementRef<HTMLDivElement>;
  isRenaming = false;
  renameValue = '';
  renameError = false;
  isDragging = false;
  dragLeft = 0;
  dragTop = 0;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private mouseDownX = 0;
  private mouseDownY = 0;
  private dragStarted = false;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseUp: (e: MouseEvent) => void;

  // Expanded-item drag state (dragging a shortcut within/out of the folder)
  expandedDragShortcut: DesktopShortcut | null = null;
  isExpandedDragging = false;
  expandedDragLeft = 0;
  expandedDragTop = 0;
  expandedDropIndex: number = -1;
  private expandedDragStarted = false;
  private expandedMouseDownX = 0;
  private expandedMouseDownY = 0;
  private boundExpandedMouseMove: (e: MouseEvent) => void;
  private boundExpandedMouseUp: (e: MouseEvent) => void;

  constructor() {
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundExpandedMouseMove = this.onExpandedMouseMove.bind(this);
    this.boundExpandedMouseUp = this.onExpandedMouseUp.bind(this);
  }

  /** Get the first N child icon URLs for the folder's preview grid */
  get previewIcons(): { url: string | null; label: string }[] {
    const maxIcons = FOLDER_GRID_SIZE * FOLDER_GRID_SIZE;
    return this.childShortcuts.slice(0, maxIcons).map(s => {
      const plugin = this.pluginMap.get(s.pluginId);
      return {
        url: s.displayIcon || plugin?.image || null,
        label: s.displayLabel || plugin?.label || ''
      };
    });
  }

  get label(): string {
    return this.folder?.name || 'New Folder';
  }

  get positionStyle(): { [key: string]: string } {
    if (this.isDragging) {
      return {
        left: this.dragLeft + 'px',
        top: this.dragTop + 'px',
        width: this.iconCellWidth + 'px',
        height: this.iconCellHeight + 'px',
        'z-index': '10000',
        opacity: '0.8'
      };
    }
    const left = this.gridPadding + this.folder.gridCol * this.iconCellWidth;
    const top = this.gridPadding + this.folder.gridRow * this.iconCellHeight;
    return {
      left: left + 'px',
      top: top + 'px',
      width: this.iconCellWidth + 'px',
      height: this.iconCellHeight + 'px'
    };
  }

  /** Size of each mini icon in the folder preview grid */
  get miniIconSize(): number {
    return Math.floor((this.iconImageSize - 4) / FOLDER_GRID_SIZE);
  }

  get folderGridSize(): number {
    return FOLDER_GRID_SIZE;
  }

  get emptyGridCells(): any[] {
    const count = Math.max(0, FOLDER_GRID_SIZE * FOLDER_GRID_SIZE - this.previewIcons.length);
    return new Array(count);
  }

  get hasCustomIcon(): boolean {
    return !!this.folder?.displayIcon;
  }

  trackByIndex(index: number): number {
    return index;
  }

  getShortcutIcon(shortcut: DesktopShortcut): string | null {
    return shortcut.displayIcon || this.pluginMap.get(shortcut.pluginId)?.image || null;
  }

  getShortcutLabel(shortcut: DesktopShortcut): string {
    return shortcut.displayLabel || this.pluginMap.get(shortcut.pluginId)?.label || '';
  }

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.dragStarted) {
      this.folderClicked.emit({ folder: this.folder, ctrlKey: event.ctrlKey || event.metaKey });
    }
  }

  onDblClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.isDragging) {
      this.folderOpened.emit(this.folder);
    }
  }

  onRightClick(event: MouseEvent): boolean {
    event.preventDefault();
    event.stopPropagation();
    if (this.isRenaming) {
      this.cancelRename();
    }
    this.folderContextMenu.emit({ event, folder: this.folder });
    return false;
  }

  startRename(): void {
    this.renameValue = this.folder?.name || '';
    this.renameError = false;
    this.isRenaming = true;
    setTimeout(() => {
      if (this.renameInputRef) {
        this.renameInputRef.nativeElement.focus();
        this.renameInputRef.nativeElement.select();
      }
    });
  }

  confirmRename(): void {
    const trimmed = this.renameValue.trim();
    if (!trimmed) {
      this.renameError = true;
      return;
    }
    const isDuplicate = this.allFolders.some(f =>
      f.id !== this.folder.id && f.name === trimmed
    );
    if (isDuplicate) {
      this.renameError = true;
      return;
    }
    this.isRenaming = false;
    this.renameError = false;
    this.folderRenamed.emit({ folder: this.folder, newName: trimmed });
  }

  cancelRename(): void {
    this.isRenaming = false;
    this.renameError = false;
    this.folderRenameCancelled.emit(this.folder);
  }

  onRenameKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Enter') {
      this.confirmRename();
    } else if (event.key === 'Escape') {
      this.cancelRename();
    }
  }

  onMouseDown(event: MouseEvent): void {
    if (event.button !== 0 || this.isOpen) return;
    this.mouseDownX = event.clientX;
    this.mouseDownY = event.clientY;
    this.dragStarted = false;

    const gridLeft = this.gridPadding + this.folder.gridCol * this.iconCellWidth;
    const gridTop = this.gridPadding + this.folder.gridRow * this.iconCellHeight;
    this.dragOffsetX = event.clientX - gridLeft;
    this.dragOffsetY = event.clientY - gridTop;

    window.addEventListener('mousemove', this.boundOnMouseMove);
    window.addEventListener('mouseup', this.boundOnMouseUp);
  }

  private onMouseMove(event: MouseEvent): void {
    const dx = event.clientX - this.mouseDownX;
    const dy = event.clientY - this.mouseDownY;
    if (!this.isDragging && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      this.isDragging = true;
      this.dragStarted = true;
    }
    if (this.isDragging) {
      this.dragLeft = event.clientX - this.dragOffsetX;
      this.dragTop = event.clientY - this.dragOffsetY;
    }
  }

  private onMouseUp(event: MouseEvent): void {
    window.removeEventListener('mousemove', this.boundOnMouseMove);
    window.removeEventListener('mouseup', this.boundOnMouseUp);

    if (this.isDragging) {
      const newCol = Math.min(this.maxGridCols - 1, Math.max(0, Math.round((this.dragLeft - this.gridPadding) / this.iconCellWidth)));
      const newRow = Math.min(this.maxGridRows - 1, Math.max(0, Math.round((this.dragTop - this.gridPadding) / this.iconCellHeight)));

      if (newRow !== this.folder.gridRow || newCol !== this.folder.gridCol) {
        this.folderMoved.emit({ folder: this.folder, newRow, newCol });
      }

      this.isDragging = false;
    }
  }

  // ── Expanded-item drag (drag shortcut out of folder to desktop) ──

  onExpandedItemRightClick(event: MouseEvent, shortcut: DesktopShortcut): void {
    event.preventDefault();
    event.stopPropagation();
    this.shortcutContextMenu.emit({ event, shortcut });
  }

  onExpandedItemClick(event: MouseEvent, shortcut: DesktopShortcut): void {
    event.stopPropagation();
    if (!this.expandedDragStarted) {
      this.shortcutLaunched.emit(shortcut);
    }
  }

  onExpandedItemMouseDown(event: MouseEvent, shortcut: DesktopShortcut): void {
    if (event.button !== 0) return;
    this.expandedMouseDownX = event.clientX;
    this.expandedMouseDownY = event.clientY;
    this.expandedDragShortcut = shortcut;
    this.expandedDragStarted = false;
    window.addEventListener('mousemove', this.boundExpandedMouseMove);
    window.addEventListener('mouseup', this.boundExpandedMouseUp);
  }

  private onExpandedMouseMove(event: MouseEvent): void {
    const dx = event.clientX - this.expandedMouseDownX;
    const dy = event.clientY - this.expandedMouseDownY;
    if (!this.isExpandedDragging && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      this.isExpandedDragging = true;
      this.expandedDragStarted = true;
    }
    if (this.isExpandedDragging) {
      this.expandedDragLeft = event.clientX - 35;
      this.expandedDragTop = event.clientY - 35;
      this.expandedDropIndex = this.getDropIndex(event.clientX, event.clientY);
    }
  }

  private onExpandedMouseUp(event: MouseEvent): void {
    window.removeEventListener('mousemove', this.boundExpandedMouseMove);
    window.removeEventListener('mouseup', this.boundExpandedMouseUp);
    if (this.isExpandedDragging && this.expandedDragShortcut) {
      if (this.isInsideExpandedPanel(event.clientX, event.clientY)) {
        // Reorder within the folder
        const sourceIndex = this.childShortcuts.indexOf(this.expandedDragShortcut);
        let targetIndex = this.expandedDropIndex >= 0 ? this.expandedDropIndex : sourceIndex;
        if (targetIndex !== sourceIndex) {
          const reordered = [...this.childShortcuts];
          reordered.splice(sourceIndex, 1);
          reordered.splice(targetIndex, 0, this.expandedDragShortcut);
          this.shortcutReordered.emit({ folder: this.folder, newOrder: reordered });
        }
      } else {
        // Drag out to desktop
        this.shortcutDraggedOutToDesktop.emit({
          folder: this.folder,
          shortcut: this.expandedDragShortcut,
          clientX: event.clientX,
          clientY: event.clientY
        });
      }
    }
    this.isExpandedDragging = false;
    this.expandedDragShortcut = null;
    this.expandedDropIndex = -1;
  }

  private isInsideExpandedPanel(clientX: number, clientY: number): boolean {
    if (!this.expandedPanelRef) return false;
    const rect = this.expandedPanelRef.nativeElement.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  private getDropIndex(clientX: number, clientY: number): number {
    if (!this.expandedPanelRef) return -1;
    const items = this.expandedPanelRef.nativeElement.querySelectorAll('.desktop-folder-expanded-item');
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      if (clientX < centerX && clientY < rect.bottom && clientY >= rect.top) {
        return i;
      }
      if (clientX >= centerX && clientX <= rect.right && clientY < rect.bottom && clientY >= rect.top) {
        return i + 1 > this.childShortcuts.length - 1 ? this.childShortcuts.length - 1 : i + 1;
      }
    }
    // If below all items or past the end, return last position
    if (items.length > 0) {
      const lastRect = items[items.length - 1].getBoundingClientRect();
      if (clientY >= lastRect.top) {
        return this.childShortcuts.length - 1;
      }
    }
    return -1;
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
