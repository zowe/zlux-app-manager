

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Injector } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { LaunchbarItem } from '../shared/launchbar-item';
import { PluginLaunchbarItem } from '../shared/launchbar-items/plugin-launchbar-item';
import { DesktopPluginDefinitionImpl } from "app/plugin-manager/shared/desktop-plugin-definition";
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { WindowManagerService } from '../../shared/window-manager.service';
import { PluginsDataService } from '../../services/plugins-data.service';
import { TranslationService } from 'angular-l10n';
import { generateInstanceActions } from '../shared/context-utils';

@Component({
  selector: 'rs-com-launchbar',
  templateUrl: './launchbar.component.html',
  styleUrls: ['./launchbar.component.css', '../shared/shared.css'],
  providers: [PluginsDataService]
})
export class LaunchbarComponent {
  allItems: LaunchbarItem[];
  runItems: LaunchbarItem[];
  isActive: boolean;
  contextMenuRequested: Subject<{xPos: number, yPos: number, items: ContextMenuItem[]}>;
  originalX: number;
  mouseOriginalX: number;
  currentEvent: EventTarget | null;
  private currentItem: LaunchbarItem | null;
  moving: boolean;
  newPosition: number;
  loggedIn: boolean;
  helperLoggedIn: boolean;
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  private authenticationManager: MVDHosting.AuthenticationManagerInterface;
  private pluginManager: MVDHosting.PluginManagerInterface;
  propertyWindowPluginDef: DesktopPluginDefinitionImpl;
  
   constructor(
    private pluginsDataService: PluginsDataService,
    private injector: Injector,
    public windowManager: WindowManagerService,
    private translation: TranslationService
  ) {
     // Workaround for AoT problem with namespaces (see angular/angular#15613)
     this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
     this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
     this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
     this.allItems = [];
     this.runItems = [];
     this.isActive = false;
     this.contextMenuRequested = new Subject();
     this.loggedIn = false;
     this.helperLoggedIn = false; //helperLoggedIn is to indicate when the initial login happens
     this.pluginManager.pluginsAdded.subscribe((plugins:MVDHosting.DesktopPluginDefinition[])=> {
       plugins.forEach((p: any)=> {
         let pluginDef = p.getBasePlugin().getBasePlugin();
         if (pluginDef.identifier === 'org.zowe.zlux.appmanager.applugin.propview') {
           this.propertyWindowPluginDef = p;
         } else if (!pluginDef.isSystemPlugin && pluginDef.webContent) {
           this.allItems.push(new PluginLaunchbarItem(p, this.windowManager));
         }
       });
       this.pluginsDataService.refreshPinnedPlugins(this.allItems);
     });
   }

  getNewItems(): void {
    this.pluginManager.loadApplicationPluginDefinitions(true);
  }

  ngDoCheck(): void {
    if (this.authenticationManager.getUsername() != null) {
      this.loggedIn = true;
    } else {
      this.allItems = [];
      this.loggedIn = false;
      this.helperLoggedIn = false;
    }
    if (this.loggedIn) {
      this.helperLoggedIn = true;
    }
  }

  activeToggle(): void {
    this.isActive = !this.isActive;
  }

  get pinnedItems(): LaunchbarItem[] {
    return this.pluginsDataService.pinnedPlugins;
  }

  get runningItems(): LaunchbarItem[] {
    let openPlugins = this.allItems.filter(item =>
                                this.applicationManager.isApplicationRunning(item.plugin));
    let openItems: LaunchbarItem[];
    openItems = [];
    openPlugins.forEach(p => {
      if (!this.pluginsDataService.isPinnedPlugin(p)){
        openItems.push(p);
      }
    })
    return openItems;
  }
  menuItemClicked(item: LaunchbarItem): void {
    this.applicationManager.spawnApplication(item.plugin, null)
  }

  launchbarItemClicked(event: MouseEvent, item: LaunchbarItem): void {
    if (item.instanceIds.length > 1) {
      item.showInstanceView = !item.showInstanceView;
      (<HTMLImageElement>event.target)!.parentElement!.parentElement!.style.zIndex = '0';
    } else if (item.instanceIds.length == 1) {
      let windowId = this.windowManager.getWindow(item.plugin);
      if (windowId != null) {
        if (this.windowManager.windowHasFocus(windowId)){
          this.windowManager.minimizeToggle(windowId);
        } else {
          this.windowManager.requestWindowFocus(windowId);
        }
      }
    } else {
      item.showInstanceView = false;
      this.applicationManager.showApplicationWindow(item.plugin)
    }
  }

  onStateChanged(isActive: boolean): void {
    this.isActive = isActive;
  }
  
  onRightClick(event: MouseEvent, item: LaunchbarItem): boolean {
    let menuItems: ContextMenuItem[] = generateInstanceActions(item, this.pluginsDataService, this.translation, this.applicationManager, this.windowManager);
    this.windowManager.contextMenuRequested.next({xPos: event.clientX, yPos: event.clientY, items: menuItems});
    return false;
  }

  onMouseDown(event: MouseEvent, item: LaunchbarItem): void {
    (<HTMLImageElement>event.target).style.zIndex = '999';
      this.originalX = (<HTMLImageElement>event.target).getBoundingClientRect().left
      this.mouseOriginalX = event.clientX;
      if (event.target != null){
        this.currentItem = item;
        this.currentEvent = event.target;
      }
    if(event.button == 3){
      this.onRightClick(event, item);
    }
  }

  // Commented out to disable rearrange functionality since there is a bug
  onMouseMove(event: MouseEvent, item: LaunchbarItem): void{
    /*
    let widget = document.getElementsByClassName("launch-widget");
    let clockStart = window.innerWidth - document.getElementsByClassName("launchbar-clock")[0].clientWidth;
    if(event.which == 1){
      let mouseDifference = event.clientX - this.mouseOriginalX;
      if (Math.abs(mouseDifference) > 5 && event.target == this.currentEvent &&
          event.clientX > widget[0].clientWidth + 30 && event.clientX < clockStart - 65) {
        this.moving = true;
        (<HTMLImageElement>event.target).style.position = 'absolute';
        (<HTMLImageElement>event.target).style.left = (event.clientX - 30) + 'px';
      } else if (event.clientX < widget[0].clientWidth) {
        (<HTMLImageElement>event.target).style.left = widget[0].clientWidth +'px';
      } else if (event.clientX > clockStart - 35) {
        (<HTMLImageElement>event.target).style.left = (clockStart - 65) + 'px';
      }
    }
    */
  }

  onMouseUpContainer(event: MouseEvent): void {
    if (this.currentItem != null) {
      this.onMouseUp(event, this.currentItem);
    }
  }

  onMouseUp(event: MouseEvent, item: LaunchbarItem): void {
      let mouseDifference = event.clientX - this.mouseOriginalX;
      if (Math.abs(mouseDifference) < 5 && event.button == 0) {
        this.launchbarItemClicked(event, item);
      } else if (!this.pluginsDataService.isPinnedPlugin(item)) {
        // The remaining logic assumes a pinned plugin, and messes up when the item is
        // not pinned, so, if the plugin is not pinned, jump out here.
        return;
      } else {
        this.moving = false;
      }
      // Commented out to disable rearrange functionality since there is a bug
      /*
      if (event.button == 0 && Math.abs(mouseDifference) > 30) {
        if(mouseDifference > 0 ) {
          mouseDifference += 30;
        } else {
          mouseDifference += 75;
        }
        let offset = Math.floor((mouseDifference)/60);
        let pluginArray: string[] = [];
        this.pluginsDataService.pinnedPlugins.forEach(item => pluginArray.push(item.plugin.getBasePlugin().getIdentifier()));
        let index = pluginArray.indexOf(item.plugin.getBasePlugin().getIdentifier());
        if (pluginArray.length > 0) {
          this.pluginsDataService.arrayMove(pluginArray, index, index+offset);
        }
      } else if(event.button == 0 && Math.abs(mouseDifference) > 5) {
        this.pluginsDataService.refreshPinnedPlugins(this.allItems);
      }
      */
      (<HTMLImageElement>event.target).style.zIndex = '7';
      this.currentEvent = null;
      this.currentItem = null;
  }

  // Commented out to disable rearrange functionality since there is a bug
  onMouseMoveContainer(event: MouseEvent): void {
    /*let widgetEnd = document.getElementsByClassName("launch-widget")[0].clientWidth;
    let clockStart = window.innerWidth - document.getElementsByClassName("launchbar-clock")[0].clientWidth;
    if (this.moving) {
      (<HTMLImageElement>event.target)!.parentElement!.parentElement!.style.zIndex = '7';
      if (this.currentEvent != undefined){
        this.newPosition = Math.floor(((<HTMLImageElement>this.currentEvent).getBoundingClientRect().left - this.originalX)/60);
        if (event.clientX > widgetEnd + 30 && event.clientX < clockStart - 65){
          (<HTMLImageElement>this.currentEvent).style.position = 'absolute';
          (<HTMLImageElement>this.currentEvent).style.left = (event.clientX - 30) + 'px';
        } else if (event.clientX < widgetEnd) {
          (<HTMLImageElement>this.currentEvent).style.left = widgetEnd + 'px';
        } else if (event.clientX > clockStart - 35) {
          (<HTMLImageElement>this.currentEvent).style.left = (clockStart - 65) + 'px';
        }
      }
    }*/
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

