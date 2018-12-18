/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, ElementRef, Input, Output, EventEmitter, Injector } from '@angular/core';
import { PluginsDataService } from '../../services/plugins-data.service';
import { LaunchbarItem } from '../shared/launchbar-item';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { WindowManagerService } from '../../shared/window-manager.service'
import { TranslationService } from 'angular-l10n';
import { DesktopPluginDefinitionImpl } from "app/plugin-manager/shared/desktop-plugin-definition";
import { FocusableOption } from '@angular/cdk/a11y';

@Component({
  selector: 'rs-com-launchbar-menu-item',
  templateUrl: './launchbar-menu-item.component.html',
  styleUrls: ['./launchbar-menu-item.component.css'],
  host: {
    'tabindex': '0'
  }
})
export class LaunchbarMenuItemComponent implements FocusableOption {
  @Input() item: LaunchbarItem;
  @Output() itemClicked: EventEmitter<LaunchbarItem> = new EventEmitter<LaunchbarItem>();
  pluginManager: MVDHosting.PluginManagerInterface;
  applicationManager: MVDHosting.ApplicationManagerInterface;
  propertyWindowPluginDef: DesktopPluginDefinitionImpl;

  constructor(
    private elementRef: ElementRef,
    public windowManager: WindowManagerService,
    private pluginsDataService: PluginsDataService,
    private injector: Injector,
    private translation: TranslationService

  ) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
    this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
  }

  ngOnInit(): void {
    this.pluginManager.findPluginDefinition('org.zowe.zlux.appmanager.app.propview')
      .then(viewerPlugin => this.propertyWindowPluginDef = viewerPlugin as DesktopPluginDefinitionImpl);
  }

  getAppPropertyInformation(plugin: DesktopPluginDefinitionImpl): any {
    const pluginImpl: DesktopPluginDefinitionImpl = plugin as DesktopPluginDefinitionImpl;
    const basePlugin = pluginImpl.getBasePlugin();
    return {
      isPropertyWindow: true,
      appName: pluginImpl.defaultWindowTitle,
      appVersion: basePlugin.getVersion(),
      appType: basePlugin.getType(),
      copyright: pluginImpl.getCopyright(),
      image: plugin.image
    };
  }

  launchPluginPropertyWindow(plugin: DesktopPluginDefinitionImpl): void {
    const propertyWindowID = this.windowManager.getWindow(this.propertyWindowPluginDef);
    if (propertyWindowID != null) {
      this.windowManager.showWindow(propertyWindowID);
    } else {
      this.applicationManager.spawnApplication(this.propertyWindowPluginDef, this.getAppPropertyInformation(plugin));
    }
  }

  clicked(item: LaunchbarItem): void {
    this.itemClicked.emit(item);
  }

  onRightClick(event: MouseEvent, item: LaunchbarItem): boolean {
    const menuItems: ContextMenuItem[] =
      [
        this.pluginsDataService.pinContext(item),
        {
          'text': this.translation.translate('Properties'),
          'action': () => this.launchPluginPropertyWindow(item.plugin)
        }
      ];
    this.windowManager.contextMenuRequested.next({ xPos: event.clientX, yPos: event.clientY - 20, items: menuItems });
    return false;
  }

  focus(): void {
    this.elementRef.nativeElement.focus();
  }

  getLabel(): string {
    return this.item.label;
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
