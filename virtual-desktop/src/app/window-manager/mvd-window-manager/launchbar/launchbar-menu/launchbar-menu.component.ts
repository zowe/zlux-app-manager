/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, ElementRef, HostListener, Input, Output, EventEmitter, Injector, ViewChild } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { PluginsDataService } from '../../services/plugins-data.service';
import { LaunchbarItem, launchBarItemFromJson, LaunchbarItemJson, launchBarItemToJson } from '../shared/launchbar-item';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { WindowManagerService } from '../../shared/window-manager.service';
import { DesktopComponent, DesktopTheme } from "../../desktop/desktop.component";
import { TranslationService } from 'angular-l10n';
import { DesktopPluginDefinitionImpl } from "app/plugin-manager/shared/desktop-plugin-definition";
import { generateInstanceActions } from '../shared/context-utils';
import { KeybindingService } from '../../shared/keybinding.service';
import { KeyCode } from '../../shared/keycode-enum';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ZosmfDiscoveryService, ZosmfItem } from '../../../../zosmf';

const FONT_SIZE=12;
const DESKTOP_PLUGIN = ZoweZLUX.pluginManager.getDesktopPlugin();
const LAUNCHBAR_GROUPS_URI = ZoweZLUX.uriBroker.pluginConfigUri(DESKTOP_PLUGIN,'ui/launchbar/pluginGroups', 'groupedPlugins.json');
// TODO: Currently assets get loaded from Web browser for convenience sake (not using CSS for now) but this can be cleaned up
const WEB_BROWSER_NAME = "org.zowe.zlux.ng2desktop.webbrowser";

@Component({
  selector: 'rs-com-launchbar-menu',
  templateUrl: './launchbar-menu.component.html',
  styleUrls: ['./launchbar-menu.component.css', '../shared/shared.css']
})
export class LaunchbarMenuComponent implements MVDHosting.LoginActionInterface{
  public displayItems:LaunchbarItem[];
  private _menuItems:LaunchbarItem[];
  private _organizedItems:LaunchbarItem[];
  public color: any = {};
  public menuIconSize: string;
  public appIconSize: string;
  public appLabelPadding: string;
  public menuBottom: string;
  public menuText: string;
  public menuWidth: string;
  public menuWidthInner: string;
  public borderRadius: string;
  /* TODO: Implement later
  public launchbarIconSize;
  public launchbarTextSize;
  public launchbarMenuSize;
  */

  public isActive: boolean = false;
  public contextMenuRequested: Subject<{xPos: number, yPos: number, items: ContextMenuItem[]}>;
  public pluginManager: MVDHosting.PluginManagerInterface;
  public applicationManager: MVDHosting.ApplicationManagerInterface;
  public propertyWindowPluginDef : DesktopPluginDefinitionImpl;
  public authenticationManager : MVDHosting.AuthenticationManagerInterface;
  public appFilter:string="";
  public activeIndex:number;  
  private isContextMenuPresent:boolean;
  private webBrowserPluginDef: DesktopPluginDefinitionImpl;

  @Input() set menuItems(items: LaunchbarItem[]) {
    this.displayItems = items;
    this._organizedItems = items;
    this.filterMenuItems();
  }
 
  @Input() set theme(newTheme: DesktopTheme) {
    this.color = newTheme.color;
    let menuIcon:number;
    let appIcon:number;

    switch (newTheme.size.launchbarMenu) {
      case 1:
        //dont go smaller than 32 for apps
        menuIcon = 16;
        appIcon = 32;
        this.menuWidth = '300px';
        this.menuWidthInner = '290px';
        this.menuText = '12px';
        this.menuBottom = '29px';
        this.borderRadius = '3px 3px 3px 0px';
        break;
      case 3:
        menuIcon = 64;
        appIcon = menuIcon;
        this.menuWidth = '410px';
        this.menuWidthInner = '400px';
        this.menuText = '16px';
        this.menuBottom = '80px';
        this.borderRadius = '7px 7px 7px 0px';
        break;
      default: // Default is medium size - 2
        menuIcon = 32;
        appIcon = menuIcon;
        this.menuWidth = '335px';
        this.menuWidthInner = '325px';
        this.menuText = '14px';
        this.menuBottom = '45px';
        this.borderRadius = '5px 5px 5px 0px';
    }
    
    this.menuIconSize = menuIcon+'px';
    this.appIconSize = appIcon+'px';
    let appLabel:number = Math.round((appIcon/2) - (FONT_SIZE/2));
    this.appLabelPadding = appLabel+'px';
  };
  
  @ViewChild('searchapp') searchAppInputRef: ElementRef;
  @ViewChild('menudiv') menuDivRef: ElementRef;

  @Output() refreshClicked: EventEmitter<void>;
  @Output() itemClicked: EventEmitter<LaunchbarItem>;
  @Output() menuStateChanged: EventEmitter<boolean>;

  constructor(
    private elementRef: ElementRef,
    public windowManager: WindowManagerService,
    private pluginsDataService: PluginsDataService,
    private injector: Injector,
    private translation: TranslationService,
    private desktopComponent: DesktopComponent,
    private appKeyboard: KeybindingService,
    private http: HttpClient,
    private zosmfDiscovery: ZosmfDiscoveryService,
  ) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
    this.itemClicked = new EventEmitter();
    this.refreshClicked = new EventEmitter();
    this.menuStateChanged = new EventEmitter<boolean>();
    this.authenticationManager.registerPostLoginAction(this);
    
    this.activeIndex = 0;
    this.isContextMenuPresent = false;
    this.webBrowserPluginDef = new DesktopPluginDefinitionImpl(ZoweZLUX.pluginManager.getPlugin('org.zowe.zlux.ng2desktop.webbrowser'))
  }

  onLogin(plugins:any): boolean {
    this.pluginManager.findPluginDefinition("org.zowe.zlux.appmanager.shortcuts", false).then(viewerPlugin => {
      const pluginImpl:DesktopPluginDefinitionImpl = viewerPlugin as DesktopPluginDefinitionImpl;
      this.propertyWindowPluginDef=pluginImpl;
    })
    this.loadGroups();
    return true;
  }

  loadGroups(): void {  
    this.http.get<any>(LAUNCHBAR_GROUPS_URI, {observe: 'response'}).pipe(
      map(res => res),
      catchError(err => of(err)),
    ).subscribe((data) => {
      console.log("load app groups result:", data)
      if (data.status < 300 && data.status > 199 && data.status != 204) {
        const groups = data.body.contents.groups as LaunchbarItemJson[];
        const itemGroups = groups.map(group => launchBarItemFromJson(group));
        this.addGroups(itemGroups);
      } else if (data.status == 204) {
        this._initializeGroups().then(groups => {this.addGroups(groups);});
      }
    });
  }

  _flattenItemList(items: LaunchbarItem[], flatList: LaunchbarItem[]) {
    items.forEach((item:LaunchbarItem) => {
      if (item.plugin) {
        let found = false;
        for (let i = 0; i < flatList.length; i++) {
          if ((item.plugin.basePlugin as any).identifier == (flatList[i].plugin.basePlugin as any).identifier) {
            found = true;
            break;
          }
        }
        if (!found) {
          flatList.push(item);
        }
      } else if (item.childrenLaunchbarItems) {
        flatList = this._flattenItemList(item.childrenLaunchbarItems, flatList);
      }
    });
    return flatList;
  }

  addGroups(groups:LaunchbarItem[]) {
    this._menuItems = this._flattenItemList(this._organizedItems,[]);
    
    groups.forEach((entry:any)=> {
      if ((typeof entry == 'object') && entry.label) {
        console.log('entry label=',entry.label);
        if (entry.childrenIds) {
          entry.childrenLaunchbarItems = entry.childrenLaunchbarItems || [];
          entry.isExpanded = false;
          entry.childrenIds.forEach((id:string)=> {
            console.log('process id=',id);
            //substitute and remove
            for (let i = 0; i < this._menuItems.length; i++) {
              let item = this._menuItems[i];
              console.log('check item=',item);
              if (item.plugin && ((item.plugin.basePlugin as any).identifier == id)) {
                entry.childrenLaunchbarItems.push(item);
                item.parentLaunchbarItem = entry;
                for (let j = 0; j < this._organizedItems.length; j++) {
                  if ((this._organizedItems[j].plugin.basePlugin as any).identifier == id) {
                    console.log('removing item from root',id);
                    this._organizedItems.splice(j,1);
                    break;
                  }
                }
                //TODO can a plugin exist in multiple folders?
                //For now, no.
                break;
              }
            }
          });
        }
        //add to list
        console.log('group extracted as',entry);
        delete entry.childrenIds;
        //TODO what if another entry has the same label?
        this._organizedItems.push(entry);
        this._menuItems.push(entry);
      }
    });
    console.log('end addgroups, start filtering');
    this.resetMenu();
  }

  //This should init the config service file if its missing.
  _initializeGroups(): Promise<LaunchbarItem[]> {
    return new Promise((resolve, reject)=> {
      // TODO: Launchbar group generation code goes here (i.e. z/OSMF links)
      let zosmfItem = <LaunchbarItem>{
        label: "z/OSMF rs28",
        tooltip: "Houses your z/OSMF apps",
        image: "/ZLUX/plugins/"+WEB_BROWSER_NAME+"/web/assets/generic-folder.png",
        showIconLabel: true,
        childrenLaunchbarItems: undefined,
        isExpanded: false
      };

      this.zosmfDiscovery.zosmfUrl$.pipe(
        switchMap(zosmfUrl => {
          if (zosmfUrl) {
            console.log(`zosmf configured using URL %s`, zosmfUrl);
            return this.zosmfDiscovery.loadZosmfShortcuts().pipe(
              map(items => items.map(item => this.convertZosmfItemToLaunchbarItem(item, zosmfItem, zosmfUrl)))
            );
          } else {
            console.log(`zosmf not configured`);
            return of([]);
          }
        })
      ).subscribe(items => {
        console.log(`zosmf apps`, items);
        zosmfItem.childrenLaunchbarItems = items;

        const launchbarGroups = {
          "groups":<LaunchbarItem[]>[
            { label: 'Sample apps',
              tooltip: 'Education apps for developers',
              image: "/ZLUX/plugins/"+WEB_BROWSER_NAME+"/web/assets/generic-folder.png",
              showIconLabel: true,
              childrenIds: [
                "org.zowe.zlux.sample.angular", 
                "org.zowe.zlux.sample.react", 
                "org.zowe.zlux.sample.iframe"
              ]
            }
          ]
        }
        if (zosmfItem.childrenLaunchbarItems && zosmfItem.childrenLaunchbarItems.length > 0) {
          launchbarGroups.groups.push(zosmfItem);
          const groupsToSave = launchbarGroups.groups.map(launchBarItemToJson);
          this.http.put(LAUNCHBAR_GROUPS_URI, {groups: groupsToSave}).subscribe((res) => {
            console.log('Plugin groups initialized');
          }, (err)=> {
            console.log('Plugin group init error=',err);
          });
        }
        console.log("Init groups to=",launchbarGroups.groups);
        resolve(launchbarGroups.groups);        
      });
    });
  }

  private convertZosmfItemToLaunchbarItem(item: ZosmfItem, parent:LaunchbarItem, zosmfUrl: string): LaunchbarItem {
    return <LaunchbarItem>{
      label: item.displayName,
      tooltip: item.displayName,
      image: "/ZLUX/plugins/"+(DESKTOP_PLUGIN as any).identifier+"/web/assets/images/launchbar/generic-zosmf-link.png",
      showIconLabel: true,
      launchMetadata: {
        data: {
          enableProxy: true,
          url: `${zosmfUrl}/fakeiframe${item.actionInfo}`,
          hideControls: true,
          title: item.displayName
        }
      },
      plugin: this.webBrowserPluginDef,
      parentLaunchbarItem: parent
    }
  }

  ngOnInit(): void {
    this.appKeyboard.keyUpEvent
      .subscribe((event:KeyboardEvent) => {
        // TODO: Disable bottom app bar once mvd-window-manager single app mode is functional. Variable subject to change.
        if (event.which === KeyCode.KEY_M && !window['GIZA_SIMPLE_CONTAINER_REQUESTED']) {
          this.activeToggle();
        }
    });
  }
  
  getAppPropertyInformation(plugin: DesktopPluginDefinitionImpl):any{
    const basePlugin = plugin.getBasePlugin();
    return {"isPropertyWindow":true,
    "appName":plugin.defaultWindowTitle,
    "appVersion":basePlugin.getVersion(),
    "appType":basePlugin.getType(),
    "copyright":plugin.getCopyright(),
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
    this._menuItems.filter(item => item.isExpanded).forEach((item:LaunchbarItem)=> {
      item.isExpanded = false;
      this.collapseItemFolder(item);
    });
    this.isActive = !this.isActive;
    // gain focus and clear on toggle when active
    if(this.isActive) {
      setTimeout(() => {
        this.searchAppInputRef.nativeElement.focus();
      },0);
    }
    this.emitState();
  }

  setSearchFocus() {
    this.searchAppInputRef.nativeElement.focus();
  }

  refresh(): void {
    this.resetMenu();
    this.refreshClicked.emit();
  }

  resetMenu(): void {
    this.appFilter = '';
    if (this._menuItems) {
      this._menuItems.filter(item => item.isExpanded).forEach((item:LaunchbarItem)=> {
        item.isExpanded = false;
      });
    }
    this.displayItems = this._organizedItems;
  }

  //TODO filter should be able to find plugins within a group folder by doing a recursive check.
  filterMenuItems(): void {
    this.activeIndex = 0;
    this.displayItems = this._organizedItems;
    if (this.appFilter) {     
      let filter = this.appFilter.toLowerCase();
      //TODO doesnt recurse but should
      this.displayItems = this._organizedItems.filter((item)=> {
        return ((item.tooltip.toLowerCase() as any).includes(filter)
        || (item.label.toLowerCase() as any).includes(filter));
      });
    } else {
      if (this._menuItems) {
        this._menuItems.filter(item => item.isExpanded).forEach((item:LaunchbarItem)=> {
          item.isExpanded = false;
        });
      }
    }
  }

  clicked(item: LaunchbarItem): void {
    if (item.childrenLaunchbarItems) {
      this.isActive = true;
      if (item.isExpanded) {
        item.isExpanded = false;
        this.collapseItemFolder(item);
      } else {
        item.isExpanded = true;
        this.expandItemFolder(item);
      }
    } else {
      this.itemClicked.emit(item);
      this.emitState();
      this.isActive = false;
    }
  }

  closeApplication(item: LaunchbarItem): void {
    let windowId = this.windowManager.getWindow(item.plugin);
    if (windowId != null) {
      this.windowManager.closeWindow(windowId);
    }
  }

  expandItemFolder(item: LaunchbarItem): void { 
    if (item.childrenLaunchbarItems) {
      for (let i = 0; i < this.displayItems.length; i++) {
        if (item.label == this.displayItems[i].label) {
          for (let j = 0; j < item.childrenLaunchbarItems.length; j++) {
            this.displayItems.splice(i+1, 0, item.childrenLaunchbarItems[j]);
            i++;
          }
          console.log("this.childrenLaunchbarItems ", item.childrenLaunchbarItems);
          // this.displayItems.splice(i+1, 0, newItem);
          console.log("this.displayItems ", this.displayItems);
        }
      }
    }
  }

  collapseItemFolder(item: LaunchbarItem): void { 
    if (item.childrenLaunchbarItems) {
      for (let j = 0; j < item.childrenLaunchbarItems.length; j++) {
        for (let i = 0; i < this.displayItems.length; i++) {
          if (this.displayItems[i].label == item.childrenLaunchbarItems[j].label) {
            this.displayItems.splice(i, 1);
          }
        }
      }
    }
  }

  /**
   * Close the launchbar icon if the user clicks anywhere other than on the launchbar area
   */
  @HostListener('document:mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (this.isActive && event && !this.elementRef.nativeElement.contains(event.target)) {
      this.activeToggle();
    }
  }



  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if(this.isContextMenuInDom()) {
      event.preventDefault();
      return;
    }

    // eating one render cycle
    if(this.isContextMenuPresent) {
      event.preventDefault();
      this.isContextMenuPresent = false;
      return;
    }
  
    if(!this.isSearchFocus()) return;

    switch(event.which) {
      case KeyCode.ESCAPE: {
        this.activeToggle();
        break;
      } 
      case KeyCode.ENTER: {
          if(this.activeIndex<this.displayItems.length) {
            this.clicked(this.displayItems[this.activeIndex]);
          }
          break;
      }
      case KeyCode.RIGHT_ARROW: {
        if(this.activeIndex<this.displayItems.length) {
          this.getContextMenu(this.displayItems[this.activeIndex]);
        }
        break;
      }
      case KeyCode.UP_ARROW: {
        event.preventDefault();
        if(this.activeIndex>0) {
          this.activeIndex--;
        } else {
          this.activeIndex=0;
        }
        this.scrollToActiveMenuItem();
        break;
      }
      case KeyCode.DOWN_ARROW: {
        if(this.activeIndex < this.displayItems.length-1) {
          this.activeIndex++;
        } 
        this.scrollToActiveMenuItem();
        break;
      }
    }  
  }

  private getActiveMenuItem():any {
    return this.menuDivRef.nativeElement.querySelectorAll('.launch-widget-row')[this.activeIndex];
  }

  private getContextMenu(item:LaunchbarItem):void {
    const elm = this.getActiveMenuItem();
    if(elm) {
      const pos = this.getElementPosition(elm);
      let menuItems: ContextMenuItem[] = generateInstanceActions(item, this.pluginsDataService, this.translation, this.applicationManager, this.windowManager);    
      this.windowManager.contextMenuRequested.next({ xPos: pos.x, yPos: pos.y - 20, items: menuItems });
      this.isContextMenuPresent = true;
    }
  }

  private getElementPosition(elm: any): any {
    let x = window.scrollX + elm.getBoundingClientRect().left + 40;
    let y = window.scrollY + elm.getBoundingClientRect().top + 50;
    return {x:x, y:y};
  }

  private scrollToActiveMenuItem(): void {
    const elm = this.getActiveMenuItem();
    if(elm) {
      elm.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'start' });
    }
  }

  private isContextMenuInDom(): boolean {
    return document.querySelector('com-rs-mvd-context-menu') !== null;
  }

  private isSearchFocus(): boolean {
    return document.activeElement === this.searchAppInputRef.nativeElement;
  }

  private emitState(): void {
    this.menuStateChanged.emit(this.isActive);
  }

  onRightClick(event: MouseEvent, item: LaunchbarItem): boolean {
    event.stopPropagation();
    let menuItems: ContextMenuItem[] = generateInstanceActions(item, this.pluginsDataService, this.translation, this.applicationManager, this.windowManager);    
    this.windowManager.contextMenuRequested.next({ xPos: event.clientX, yPos: event.clientY - 20, items: menuItems });
    this.isContextMenuPresent = true;
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

