/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DesktopFolder, DesktopShortcut, DesktopShortcutsService } from '../../services/desktop-shortcuts.service';
import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { DesktopTheme } from '../../desktop/desktop.component';

@Component({
  selector: 'rs-com-launchbar-folder-icon',
  templateUrl: './launchbar-folder-icon.component.html',
  styleUrls: ['./launchbar-folder-icon.component.css', '../shared/shared.css']
})
export class LaunchbarFolderIconComponent {
  @Input() folder: DesktopFolder;
  @Output() folderClicked = new EventEmitter<DesktopFolder>();
  @Output() folderRightClicked = new EventEmitter<{ event: MouseEvent; folder: DesktopFolder }>();
  @Input() childShortcuts: DesktopShortcut[] = [];
  @Input() pluginMap: Map<string, DesktopPluginDefinitionImpl> = new Map();

  public iconSize: string = '32px';
  public miniIconSize: number = 14;
  public hoverBottom: string = '30px';
  public hoverOffset: string = '-14px';

  @Input() set theme(newTheme: DesktopTheme) {
    switch (newTheme.size.launchbar) {
      case 1:
        this.iconSize = '16px';
        this.miniIconSize = 6;
        this.hoverBottom = '14px';
        this.hoverOffset = '-22px';
        break;
      case 3:
        this.iconSize = '64px';
        this.miniIconSize = 30;
        this.hoverBottom = '62px';
        this.hoverOffset = '0px';
        break;
      default:
        this.iconSize = '32px';
        this.miniIconSize = 14;
        this.hoverBottom = '30px';
        this.hoverOffset = '-14px';
        break;
    }
  }

  get previewIcons(): { url: string | null; label: string }[] {
    return this.childShortcuts.slice(0, 4).map(s => {
      const plugin = this.pluginMap.get(s.pluginId);
      return {
        url: DesktopShortcutsService.sanitizeIconUrl(s.displayIcon) || plugin?.image || null,
        label: s.displayLabel || plugin?.label || ''
      };
    });
  }

  get label(): string {
    return this.folder?.name || 'Folder';
  }

  get hasCustomIcon(): boolean {
    return !!DesktopShortcutsService.sanitizeIconUrl(this.folder?.displayIcon);
  }

  get safeDisplayIcon(): string | undefined {
    return DesktopShortcutsService.sanitizeIconUrl(this.folder?.displayIcon);
  }

  trackByIndex(index: number): number {
    return index;
  }

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.folderClicked.emit(this.folder);
  }

  onRightClick(event: MouseEvent): boolean {
    event.preventDefault();
    event.stopPropagation();
    this.folderRightClicked.emit({ event, folder: this.folder });
    return false;
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
