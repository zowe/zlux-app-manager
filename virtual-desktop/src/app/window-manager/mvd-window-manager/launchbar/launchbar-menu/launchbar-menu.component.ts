

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
import { LaunchbarItem } from '../shared/launchbar-item';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { WindowManagerService } from '../../shared/window-manager.service';
import { DesktopComponent } from "../../desktop/desktop.component";
import { TranslationService } from 'angular-l10n';
import { DesktopPluginDefinitionImpl } from "app/plugin-manager/shared/desktop-plugin-definition";
import { generateInstanceActions } from '../shared/context-utils';
import { KeybindingService } from '../../shared/keybinding.service';
import { KeyCode } from '../../shared/keycode-enum';

@Component({
  selector: 'rs-com-launchbar-menu',
  templateUrl: './launchbar-menu.component.html',
  styleUrls: ['./launchbar-menu.component.css', '../shared/shared.css']
})
export class LaunchbarMenuComponent implements MVDHosting.LoginActionInterface{
  public displayItems:LaunchbarItem[];
  private _menuItems:LaunchbarItem[];
  @Input() set menuItems(items: LaunchbarItem[]) {
    this._menuItems = items;
    this.displayItems = items;
    this.filterMenuItems();
  }
  
  @ViewChild('searchapp') searchAppInputRef: ElementRef;
  @ViewChild('menudiv') menuDivRef: ElementRef;

  @Output() refreshClicked: EventEmitter<void>;
  @Output() itemClicked: EventEmitter<LaunchbarItem>;
  @Output() menuStateChanged: EventEmitter<boolean>;
  isActive: boolean = false;
  contextMenuRequested: Subject<{xPos: number, yPos: number, items: ContextMenuItem[]}>;
  pluginManager: MVDHosting.PluginManagerInterface;
  public applicationManager: MVDHosting.ApplicationManagerInterface;
  propertyWindowPluginDef : DesktopPluginDefinitionImpl;
  public authenticationManager : MVDHosting.AuthenticationManagerInterface;
  public appFilter:string="";
  public activeIndex:number;  
  private isContextMenuPresent:boolean;

  constructor(
    private elementRef: ElementRef,
    public windowManager: WindowManagerService,
    private pluginsDataService: PluginsDataService,
    private injector: Injector,
    private translation: TranslationService,
    private desktopComponent: DesktopComponent,
    private appKeyboard: KeybindingService,
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
  }

  onLogin(plugins:any): boolean {
    this.pluginManager.findPluginDefinition("org.zowe.zlux.appmanager.app.propview", false).then(viewerPlugin => {
      const pluginImpl:DesktopPluginDefinitionImpl = viewerPlugin as DesktopPluginDefinitionImpl;
      this.propertyWindowPluginDef=pluginImpl;
    })
    return true;
  }

  ngOnInit(): void {
    this.appKeyboard.keyUpEvent
      .subscribe((event:KeyboardEvent) => {
        if (event.which === KeyCode.KEY_M) {
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
    this.displayItems = this._menuItems;
  }

  filterMenuItems(): void {
    this.activeIndex = 0;
    if (this.appFilter) {
      let filter = this.appFilter.toLowerCase();
      this.displayItems = this._menuItems.filter((item)=> {
        return ((item.tooltip.toLowerCase() as any).includes(filter)
        || (item.label.toLowerCase() as any).includes(filter));
      });
    } else {
      this.displayItems = this._menuItems;
    }
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
      this.activeToggle();
    }
  }



  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if(this.isContextMenuInDom()) {
      this.keepSearchCursor();
      return;
    }

    // eating one render cycle
    if(this.isContextMenuPresent) {
      this.isContextMenuPresent = false;
      return;
    }
  
    if(!this.isSearchFocus()) return;

    switch(event.which) {
      case KeyCode.ESCAPE: {
        // if(this.appFilter>'') {
        //   this.resetMenu(); 
        // } else {
        this.activeToggle();
        //}
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
        this.keepSearchCursor();
        if(this.activeIndex>0) {
          this.activeIndex--;
        } else {
          this.activeIndex=0;
        }
        this.scrollToActiveMenuItem();
        break;
      }
      case KeyCode.DOWN_ARROW: {
        if(this.activeIndex < this.displayItems.length) {
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

  private keepSearchCursor(): void {
    const el = this.searchAppInputRef.nativeElement;
    if (typeof el.selectionStart == "number") {
      el.selectionStart = el.selectionEnd = el.value.length;
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

