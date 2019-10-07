

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, ElementRef, HostListener, Input, Output, EventEmitter, Injector } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { PluginsDataService } from '../../services/plugins-data.service';
import { LaunchbarItem } from '../shared/launchbar-item';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { WindowManagerService } from '../../shared/window-manager.service';
import { DesktopComponent } from "../../desktop/desktop.component";
import { TranslationService } from 'angular-l10n';
import { DesktopPluginDefinitionImpl } from "app/plugin-manager/shared/desktop-plugin-definition";
import { generateInstanceActions } from '../shared/context-utils';

@Component({
  selector: 'rs-com-launchbar-menu',
  templateUrl: './launchbar-menu.component.html',
  styleUrls: ['./launchbar-menu.component.css', '../shared/shared.css']
})
export class LaunchbarMenuComponent {
  @Input() menuItems: LaunchbarItem[];
  @Output() itemClicked: EventEmitter<LaunchbarItem>;
  @Output() menuStateChanged: EventEmitter<boolean>;
  isActive: boolean = false;
  contextMenuRequested: Subject<{xPos: number, yPos: number, items: ContextMenuItem[]}>;
  pluginManager: MVDHosting.PluginManagerInterface;
  public applicationManager: MVDHosting.ApplicationManagerInterface;
  propertyWindowPluginDef : DesktopPluginDefinitionImpl;

  constructor(
    private elementRef: ElementRef,
    public windowManager: WindowManagerService,
    private pluginsDataService: PluginsDataService,
    private injector: Injector,
    private translation: TranslationService,
    private desktopComponent: DesktopComponent

  ) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
    this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
    this.itemClicked = new EventEmitter();
    this.menuStateChanged = new EventEmitter<boolean>();
  }

  ngOnInit(): void {
    this.pluginManager.findPluginDefinition("org.zowe.zlux.appmanager.app.propview").then(viewerPlugin => {
      const pluginImpl:DesktopPluginDefinitionImpl = viewerPlugin as DesktopPluginDefinitionImpl;
      this.propertyWindowPluginDef=pluginImpl;
    })
  }
  
   getAppPropertyInformation(plugin: DesktopPluginDefinitionImpl):any{
    const pluginImpl:DesktopPluginDefinitionImpl = plugin as DesktopPluginDefinitionImpl;
    const basePlugin = pluginImpl.getBasePlugin();
    return {"isPropertyWindow":true,
    "appName":pluginImpl.defaultWindowTitle,
    "appVersion":basePlugin.getVersion(),
    "appType":basePlugin.getType(),
    "copyright":pluginImpl.getCopyright(),
    "image":plugin.image
    };    
  }
  
  launchPluginPropertyWindow(plugin: DesktopPluginDefinitionImpl){
    let propertyWindowID = this.windowManager.getWindow(this.propertyWindowPluginDef);
    if (propertyWindowID!=null){
      this.windowManager.showWindow(propertyWindowID);
    } else {
      this.applicationManager.spawnApplication(this.propertyWindowPluginDef,this.getAppPropertyInformation(plugin));
    }
  }
  
  activeToggle(): void {
    this.isActive = !this.isActive;
    this.emitState();
  }

  clicked(item: LaunchbarItem): void {
    this.itemClicked.emit(item);
    this.isActive = false;
    this.emitState();
  }

  closeApplication(item: LaunchbarItem): void {
    let windowId = this.windowManager.getWindow(item.plugin);
    if (windowId != null) {
      this.windowManager.closeWindow(windowId);
    }
  }

  /**
   * Close the launchbar icon if the user clicks anywhere other than on the launchbar area
   */
  @HostListener('document:mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (this.isActive && event && !this.elementRef.nativeElement.contains(event.target)) {
      this.isActive = false;
      this.emitState();
    }
  }

  private emitState(): void {
    this.menuStateChanged.emit(this.isActive);
  }

  onRightClick(event: MouseEvent, item: LaunchbarItem): boolean {
    let menuItems: ContextMenuItem[] = generateInstanceActions(item, this.pluginsDataService, this.translation, this.applicationManager, this.windowManager);    
    this.windowManager.contextMenuRequested.next({ xPos: event.clientX, yPos: event.clientY - 20, items: menuItems });
    return false;
  }

  personalizationPanelToggle() {
    this.desktopComponent.personalizationPanelToggle();
    //this.activeToggle();
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

