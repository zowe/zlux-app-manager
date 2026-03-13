/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { DesktopShortcut } from '../services/desktop-shortcuts.service';
import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';

const ICON_CELL_WIDTH = 90;
const ICON_CELL_HEIGHT = 90;
const GRID_PADDING = 10;
const DRAG_THRESHOLD = 5;

@Component({
  selector: 'rs-com-desktop-icon',
  templateUrl: './desktop-icon.component.html',
  styleUrls: ['./desktop-icon.component.css']
})
export class DesktopIconComponent {
  @Input() shortcut: DesktopShortcut;
  @Input() plugin: DesktopPluginDefinitionImpl;
  @Input() isHighlighted: boolean = false;
  @Input() allShortcuts: DesktopShortcut[] = [];
  @Input() set shouldRename(value: boolean) {
    if (value && !this.isRenaming) {
      this.startRename();
    }
  }
  @Output() iconSelected = new EventEmitter<DesktopShortcut>();
  @Output() iconLaunched = new EventEmitter<DesktopShortcut>();
  @Output() iconContextMenu = new EventEmitter<{ event: MouseEvent; shortcut: DesktopShortcut }>();
  @Output() iconMoved = new EventEmitter<{ shortcut: DesktopShortcut; newRow: number; newCol: number }>();
  @Output() iconRenamed = new EventEmitter<{ shortcut: DesktopShortcut; newLabel: string }>();

  @ViewChild('renameInput') renameInputRef: ElementRef<HTMLInputElement>;
  isRenaming = false;
  renameValue = '';
  renameError = false;
  isDragging = false;
  dragOffsetX = 0;
  dragOffsetY = 0;
  dragLeft = 0;
  dragTop = 0;
  private mouseDownX = 0;
  private mouseDownY = 0;
  private dragStarted = false;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseUp: (e: MouseEvent) => void;

  constructor() {
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
  }

  get iconUrl(): string | null {
    return this.shortcut?.displayIcon || this.plugin?.image || null;
  }

  get label(): string {
    const baseLabel = this.shortcut?.displayLabel || this.plugin?.label || '';
    if (!baseLabel || !this.allShortcuts || this.allShortcuts.length <= 1) {
      return baseLabel;
    }
    // Find all shortcuts with the same base label
    const duplicates = this.allShortcuts.filter(s => {
      const sLabel = s.displayLabel || '';
      const thisLabel = this.shortcut?.displayLabel || '';
      // For simple shortcuts (no displayLabel), use plugin label — these won't collide
      // For action shortcuts with displayLabel, check for duplicates
      if (!thisLabel) return false;
      return sLabel === thisLabel;
    });
    if (duplicates.length <= 1) {
      return baseLabel;
    }
    const idx = duplicates.findIndex(s =>
      s.gridRow === this.shortcut.gridRow && s.gridCol === this.shortcut.gridCol
    );
    return idx > 0 ? baseLabel + ' (' + (idx + 1) + ')' : baseLabel;
  }

  get positionStyle(): { [key: string]: string } {
    if (this.isDragging) {
      return {
        left: this.dragLeft + 'px',
        top: this.dragTop + 'px',
        width: ICON_CELL_WIDTH + 'px',
        height: ICON_CELL_HEIGHT + 'px',
        'z-index': '10000',
        opacity: '0.8'
      };
    }
    const left = GRID_PADDING + this.shortcut.gridCol * ICON_CELL_WIDTH;
    const top = GRID_PADDING + this.shortcut.gridRow * ICON_CELL_HEIGHT;
    return {
      left: left + 'px',
      top: top + 'px',
      width: ICON_CELL_WIDTH + 'px',
      height: ICON_CELL_HEIGHT + 'px'
    };
  }

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.dragStarted) {
      this.iconSelected.emit(this.shortcut);
    }
  }

  onDblClick(event: MouseEvent): void {
    event.stopPropagation();
    this.iconLaunched.emit(this.shortcut);
  }

  onRightClick(event: MouseEvent): boolean {
    event.preventDefault();
    event.stopPropagation();
    if (this.isRenaming) {
      this.cancelRename();
    }
    this.iconContextMenu.emit({ event, shortcut: this.shortcut });
    return false;
  }

  startRename(): void {
    this.renameValue = this.shortcut?.displayLabel || this.plugin?.label || '';
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
    const isDuplicate = this.allShortcuts.some(s =>
      !(s.gridRow === this.shortcut.gridRow && s.gridCol === this.shortcut.gridCol)
      && (s.displayLabel || '') === trimmed
    );
    if (isDuplicate) {
      this.renameError = true;
      return;
    }
    this.isRenaming = false;
    this.renameError = false;
    this.iconRenamed.emit({ shortcut: this.shortcut, newLabel: trimmed });
  }

  cancelRename(): void {
    this.isRenaming = false;
    this.renameError = false;
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
    if (event.button !== 0) return;
    this.mouseDownX = event.clientX;
    this.mouseDownY = event.clientY;
    this.dragStarted = false;

    const gridLeft = GRID_PADDING + this.shortcut.gridCol * ICON_CELL_WIDTH;
    const gridTop = GRID_PADDING + this.shortcut.gridRow * ICON_CELL_HEIGHT;
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
      const newCol = Math.max(0, Math.round((this.dragLeft - GRID_PADDING) / ICON_CELL_WIDTH));
      const newRow = Math.max(0, Math.round((this.dragTop - GRID_PADDING) / ICON_CELL_HEIGHT));

      const occupied = this.allShortcuts.some(s =>
        s.pluginId !== this.shortcut.pluginId && s.gridRow === newRow && s.gridCol === newCol
      );

      if (!occupied && (newRow !== this.shortcut.gridRow || newCol !== this.shortcut.gridCol)) {
        this.iconMoved.emit({ shortcut: this.shortcut, newRow, newCol });
      }

      this.isDragging = false;
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
