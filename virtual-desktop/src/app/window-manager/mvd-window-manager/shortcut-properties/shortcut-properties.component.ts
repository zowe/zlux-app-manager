/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { DesktopShortcut, DesktopShortcutsService } from '../services/desktop-shortcuts.service';
import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';

@Component({
  selector: 'rs-com-shortcut-properties',
  templateUrl: './shortcut-properties.component.html',
  styleUrls: ['./shortcut-properties.component.css']
})
export class ShortcutPropertiesComponent implements OnInit {
  @Input() shortcut: DesktopShortcut;
  @Input() plugin: DesktopPluginDefinitionImpl | undefined;
  @Output() closed = new EventEmitter<void>();
  @Output() iconChanged = new EventEmitter<{ shortcut: DesktopShortcut; iconUrl: string | undefined }>();
  @Output() launchMetadataChanged = new EventEmitter<{ shortcut: DesktopShortcut; launchMetadata: any }>();

  originalName: string = '';
  displayName: string = '';
  pluginId: string = '';
  pluginVersion: string = '';
  iconUrl: string = '';
  createdDate: string = '';
  modifiedDate: string = '';
  lastOpenedDate: string = '';
  hasAction: boolean = false;
  actionId: string = '';
  actionName: string = '';
  actionType: string = '';
  targetPluginId: string = '';
  targetMode: string = '';
  launchMetadataJson: string = '';
  launchMetadataError: string = '';
  newIconUrl: string = '';
  iconUrlError: string = '';

  ngOnInit(): void {
    this.originalName = this.plugin?.label || this.shortcut.pluginId;
    this.displayName = this.shortcut.displayLabel || this.originalName;
    this.pluginId = this.shortcut.pluginId;
    this.pluginVersion = this.plugin?.getBasePlugin()?.getVersion?.() || '';
    this.iconUrl = this.shortcut.displayIcon || this.plugin?.image || '';
    this.newIconUrl = this.shortcut.displayIcon || this.plugin?.image || '';
    this.createdDate = this.formatDateTime(this.shortcut.createdDate);
    this.modifiedDate = this.formatDateTime(this.shortcut.modifiedDate);
    this.lastOpenedDate = this.formatDateTime(this.shortcut.lastOpenedDate);

    if (this.shortcut.action) {
      this.hasAction = true;
      this.actionId = this.shortcut.action.id || '';
      this.actionName = this.shortcut.action.name || '';
      this.actionType = this.shortcut.action.type || '';
      this.targetPluginId = this.shortcut.action.targetPluginId || '';
      this.targetMode = this.shortcut.action.targetMode || '';
      this.launchMetadataJson = JSON.stringify(this.shortcut.action.launchMetadata || {}, null, 2);
    }
  }

  private formatDateTime(isoString: string | undefined): string {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  onOverlayClick(event: MouseEvent): void {
    this.closed.emit();
  }

  onPanelClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  onSaveIcon(): void {
    this.iconUrlError = '';
    const raw = this.newIconUrl.trim() || undefined;
    if (raw && !DesktopShortcutsService.sanitizeIconUrl(raw)) {
      this.iconUrlError = 'Invalid URL';
      return;
    }
    this.iconChanged.emit({ shortcut: this.shortcut, iconUrl: raw });
    this.iconUrl = raw || this.plugin?.image || '';
  }

  onClearIcon(): void {
    this.newIconUrl = this.plugin?.image || '';
    this.iconChanged.emit({ shortcut: this.shortcut, iconUrl: undefined });
    this.iconUrl = this.plugin?.image || '';
  }

  onSaveLaunchMetadata(): void {
    this.launchMetadataError = '';
    try {
      const parsed = JSON.parse(this.launchMetadataJson);
      this.launchMetadataChanged.emit({ shortcut: this.shortcut, launchMetadata: parsed });
    } catch (e) {
      this.launchMetadataError = 'Invalid JSON';
    }
  }

  onClose(): void {
    this.closed.emit();
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
