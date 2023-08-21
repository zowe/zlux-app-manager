

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, ViewContainerRef, ComponentRef, ComponentFactoryResolver, Injector } from '@angular/core';
import { Subject } from 'rxjs';

import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { ViewportComponent } from 'app/application-manager/viewport-manager/viewport/viewport.component';
//import { AppPropertiesWindowComponent } from '../propertieswindow/app-properties-window.component';
import { BaseLogger } from 'virtual-desktop-logger';

import { DesktopWindow, LocalWindowEvents } from './desktop-window';
import { WindowPosition } from './window-position';
import { DesktopWindowState, DesktopWindowStateType } from '../shared/desktop-window-state';
import { DesktopTheme } from "../desktop/desktop.component";
import { WindowMonitor } from 'app/shared/window-monitor.service';
import { ContextMenuItem, Angular2PluginWindowActions, Angular2PluginSessionEvents, Angular2PluginThemeEvents,
  Angular2PluginWindowEvents, Angular2InjectionTokens, Angular2PluginViewportEvents, Angular2PluginEmbedActions, 
  InstanceId, EmbeddedInstance
} from 'pluginlib/inject-resources';

import { KeybindingService } from './keybinding.service';
import { KeyCode } from './keycode-enum';
import { ThemeEmitterService } from '../services/theme-emitter.service';
import { HttpClient } from '@angular/common/http';

type PluginIdentifier = string;
const DEFAULT_DESKTOP_SHORT_TITLE = 'Zowe';
const DEFAULT_DESKTOP_TITLE = 'Zowe Desktop';

@Injectable()
export class WindowManagerService implements MVDWindowManagement.WindowManagerServiceInterface {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  /*
   * I'd like to apply this constant to the ".window .header" selector in ../window/window.component.css
   * but I don't know how
   */
  public static WINDOW_HEADER_HEIGHT = 45;
  public static LAUNCHBAR_HEIGHT = 70;
  private static  NEW_WINDOW_POSITION_INCREMENT = WindowManagerService.WINDOW_HEADER_HEIGHT;
  private static  MAXIMIZE_WINDOW_HEIGHT_OFFSET = WindowManagerService.WINDOW_HEADER_HEIGHT
                                                        + WindowManagerService.LAUNCHBAR_HEIGHT;

  private nextId: MVDWindowManagement.WindowId;
  private windowMap: Map<MVDWindowManagement.WindowId, DesktopWindow>;
  private runningPluginMap: Map<PluginIdentifier, MVDWindowManagement.WindowId[]>;

  private focusedWindow: DesktopWindow | null;
  private topZIndex: number;
  //private _lastScreenshotPluginId: string = '';  
  //private _lastScreenshotWindowId: number = -1;
  public showPersonalizationPanel: boolean = false;
  private autoSaveInterval : number = 300000;
  public autoSaveFiles : {[key:string]:number} = {};
  public autoSaveFileAllowDelete : boolean = true;
  public autoSaveDataClean : boolean = false;
  /*
   * NOTES:
   * 1. We ignore the width and height here (I am reluctant to make a new data type just for this,
   *    plus I don't want to make width and height optional)
   * 2. Even though this looks like it starts at (0.0), doing this simplifies the logic of
   *    generateNewWindowPosition whuile still starting off at (NEW_WINDOW_POSITION_INCREMENT, NEW_WINDOW_POSITION_INCREMENT)
   */
  private lastWindowPositionMap: Map<String, Map<MVDWindowManagement.WindowId, WindowPosition>>;

  contextMenuRequested: Subject<{xPos: number, yPos: number, items: ContextMenuItem[]}>;
  readonly windowDeregisterEmitter: Subject<MVDWindowManagement.WindowId>;
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  private viewportManager: MVDHosting.ViewportManagerInterface;
  private pluginManager: MVDHosting.PluginManagerInterface;
  public screenshotRequestEmitter: Subject<{pluginId: string, windowId: MVDWindowManagement.WindowId}>; 
  private authenticationManager: MVDHosting.AuthenticationManagerInterface;
  private sessionSubscriptions: Map<MVDWindowManagement.WindowId, Angular2PluginSessionEvents>

  constructor(
    private injector: Injector,
    private windowMonitor: WindowMonitor,
    private componentFactoryResolver: ComponentFactoryResolver,
    private appKeyboard: KeybindingService,
    private themeService: ThemeEmitterService,
    private http: HttpClient
  ) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
    this.viewportManager = this.injector.get(MVDHosting.Tokens.ViewportManagerToken);
    this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken)
    this.nextId = 0;
    this.windowMap = new Map();
    this.sessionSubscriptions = new Map();
    this.runningPluginMap = new Map();

    this.focusedWindow = null;
    this.topZIndex = 0;
    this.lastWindowPositionMap = new Map();
    this.contextMenuRequested = new Subject();
    this.windowDeregisterEmitter = new Subject();
    ZoweZLUX.dispatcher.attachWindowManager({
      "maximize" : (id: MVDWindowManagement.WindowId) => {
        this.maximize(id);
      },
      "minimize" : (id: MVDWindowManagement.WindowId) => {
        this.minimize(id);
      },
      "focus": (id: MVDWindowManagement.WindowId) => {
        this.requestWindowFocus(id);
      }
    });
    this.screenshotRequestEmitter = new Subject();
    this.windowMonitor.windowResized.subscribe(() => {
      Array.from(this.windowMap.values())
        .filter(win => win.windowState.stateType === DesktopWindowStateType.Maximized)
        .forEach(win => this.refreshMaximizedWindowSize(win));
    });

    let tabHandler = (event: KeyboardEvent) => {
      if(this.focusedWindow){
        if(event.keyCode == 9 || event.which == 9){ // tab
          let activeViewportID = this.getViewportIdFromDOM(document.activeElement);
          if(activeViewportID != Number(this.focusedWindow.viewportId)){
            let focusHTML = this.getHTML(this.focusedWindow.windowId);
            let focusTabIndex = focusHTML.getAttribute('tabindex');
            focusHTML.setAttribute('tabindex', '0');
            focusHTML.focus();
            focusHTML.setAttribute('tabindex', focusTabIndex);
          }
        }
      }
    }
    document.addEventListener('keyup', tabHandler, false);
    document.addEventListener('keydown', tabHandler, false);

    this.appKeyboard.registerKeyUpEvent();
    this.appKeyboard.keyUpEvent
      .subscribe((event:KeyboardEvent) => {
        if (event.which === KeyCode.DOWN_ARROW) {
          // TODO: Disable minimize hotkey once mvd-window-manager single app mode is functional. Variable subject to change.
          if(this.focusedWindow && !window['GIZA_PLUGIN_TO_BE_LOADED']) {
            this.minimizeToggle(this.focusedWindow.windowId);
          }
        }
        else if (event.which === KeyCode.UP_ARROW) {
          if(this.focusedWindow) {
            this.maximizeToggle(this.focusedWindow.windowId);
          }
        }
        else if (event.which === KeyCode.COMMA || event.which === KeyCode.LEFT_ARROW) {                  
            this.switchWindow(-1);
        }
        else if (event.which === KeyCode.PERIOD || event.which === KeyCode.RIGHT_ARROW) { 
            this.switchWindow(1);
        }
        else if (event.which === KeyCode.KEY_W) {
          // We should not be able to close a standalone mode application window
          if(this.focusedWindow && !this.focusedWindow.isFullscreenStandalone) {
            this.closeWindow(this.focusedWindow.windowId);
          }
        }
    });
    this.authenticationManager.loginScreenVisibilityChanged.subscribe((eventReason: MVDHosting.LoginScreenChangeReason) => {
      this.sessionSubscriptions.forEach((session: Angular2PluginSessionEvents, windowId: MVDWindowManagement.WindowId) => {
        switch (eventReason) {
          case MVDHosting.LoginScreenChangeReason.UserLogin:
            session.login.next();
          case MVDHosting.LoginScreenChangeReason.SessionExpired:
            session.sessionExpire.next();
            break;
        default:
        }
      })
    });
  }

  public static _setTheme(newTheme: DesktopTheme) {
    switch (newTheme.size.window) {
    case 1:
      WindowManagerService.WINDOW_HEADER_HEIGHT = 22;
      break;
    case 3:
      WindowManagerService.WINDOW_HEADER_HEIGHT = 47;
      break;
    default:
      WindowManagerService.WINDOW_HEADER_HEIGHT = 29;
      //2
    }
    WindowManagerService.NEW_WINDOW_POSITION_INCREMENT = WindowManagerService.WINDOW_HEADER_HEIGHT;
    
    switch (newTheme.size.launchbar) {
    case 1:
      WindowManagerService.LAUNCHBAR_HEIGHT = 25;
      break;
    case 3:
      WindowManagerService.LAUNCHBAR_HEIGHT = 76;
      break;
    default:
      //2
      WindowManagerService.LAUNCHBAR_HEIGHT = 41;
    }
    WindowManagerService.MAXIMIZE_WINDOW_HEIGHT_OFFSET = WindowManagerService.WINDOW_HEADER_HEIGHT
      + WindowManagerService.LAUNCHBAR_HEIGHT;
  }

  private getViewportIdFromDOM(element: any): Number{
    var parentViewportElement: any;
    var head = element;
    const viewportTag: string = 'com-rs-mvd-viewport';
    const viewportIdAttr: string = 'rs-com-viewport-id';
    while(head.parentNode !== document){
      if(head.parentNode.nodeName.toLowerCase() === viewportTag){
        parentViewportElement = head.parentNode;
        break;
      }
      head = head.parentNode;
    }
    if(parentViewportElement === undefined){
      return -1;
    }
    return parentViewportElement.getAttribute(viewportIdAttr);
  }

  switchWindow(zDistance:number): void {
    let windows:DesktopWindow[] = this.getAllWindows();
  
    if(this.focusedWindow) {
      const focusedWindowId :number = this.focusedWindow.windowId; 
      windows = windows.filter( (val: DesktopWindow ) => 
        val.windowId !== focusedWindowId
      );
    }  

    if(windows.length>0) {
      const sortWindows: DesktopWindow[] = windows.sort(
                          (val1:DesktopWindow, val2:DesktopWindow) => 
                          ((val1.windowState.zIndex - val2.windowState.zIndex) 
                          * zDistance)
                        );

      const windowIds = sortWindows.map((val:DesktopWindow) => val.windowId);

      if(windowIds.length>0) {
        const selectIdx: number = (Math.abs(zDistance) -1) % (windows.length);
        const windowId = windowIds[selectIdx];
        if(this.focusedWindow && zDistance<1) {
          const replaceZIndex = Math.abs(sortWindows[windowIds.length-1].windowState.zIndex)-1;
          if(replaceZIndex>0) {
            this.focusedWindow.windowState.zIndex=replaceZIndex;
          } else {
            sortWindows.forEach((w,i)=>{
              w.windowState.zIndex+=30;
            })
            this.focusedWindow.windowState.zIndex=sortWindows[windowIds.length-1].windowState.zIndex-1;
          }
        }
        this.requestWindowFocus(windowId);
      }
    }
  }

  /* TODO: https://github.com/angular/angular/issues/17725 gets in the way */
  getAllWindows(): DesktopWindow[] {
    return Array.from(this.windowMap.values());
  }

  private refreshMaximizedWindowSize(desktopWindow: DesktopWindow): void {
    //This is the window viewport size, so you must subtract the header and launchbar from the height, if not in standalone mode.
    let height;
    if (window['GIZA_PLUGIN_TO_BE_LOADED']) {
      height = window.innerHeight;
    } else {
      height = window.innerHeight - WindowManagerService.MAXIMIZE_WINDOW_HEIGHT_OFFSET;
    }
    desktopWindow.windowState.position = { top: 0,
                                           left: 0,
                                           width: window.innerWidth,
                                           height: height};
  }

  private generateWindowId(): MVDWindowManagement.WindowId {
    return this.nextId++;
  }

  private generateNewWindowPosition(plugin: DesktopPluginDefinitionImpl): WindowPosition {
    let { width: dtWindowWidth, height: dtWindowHeight } = plugin.defaultWindowStyle;
    const desktopHeight = document.getElementsByClassName('window-pane')[0].clientHeight;
    const desktopWidth = document.getElementsByClassName('window-pane')[0].clientWidth;
    const launchbarHeight = WindowManagerService.LAUNCHBAR_HEIGHT;
    const { innerWidth, innerHeight } = window;
    const rightMostPosition = innerWidth - dtWindowWidth;
    const bottomMostPosition = innerHeight - dtWindowHeight;
    const pluginIdentifier = plugin.getIdentifier();

    // By default, plugins begin in the center of the screen (half of both x & y axes)
    let nextLeft = (desktopWidth / 2) - (dtWindowWidth / 2);
    let nextTop = (desktopHeight / 2) - (dtWindowHeight / 2) - (WindowManagerService.WINDOW_HEADER_HEIGHT / 2) - (launchbarHeight / 2);

    const selectedPluginWindows = this.runningPluginMap.get(pluginIdentifier);
    if (selectedPluginWindows && selectedPluginWindows.length > 0) {
      let windowId: MVDWindowManagement.WindowId;
      windowId = this.runningPluginMap.get(pluginIdentifier)![this.runningPluginMap.get(pluginIdentifier)!.length-1];

        let windowPosition = {
          ...this.getWindowPositionFor(pluginIdentifier, windowId),
        } as WindowPosition
        let lastSavedPosition = {
          ...this.getWindowPositionFromId(pluginIdentifier),
        } as WindowPosition
        if (lastSavedPosition.width == windowPosition.width && lastSavedPosition.height == 
          windowPosition.height && lastSavedPosition.top == windowPosition.top && lastSavedPosition.left 
          == windowPosition.left)
        { // If a plugin of the same type is already running, cascade an instance below it
          if (windowPosition && windowPosition.left && windowPosition.height)
          {
            nextLeft = windowPosition.left + WindowManagerService.NEW_WINDOW_POSITION_INCREMENT;
            nextTop = windowPosition.top + WindowManagerService.NEW_WINDOW_POSITION_INCREMENT;
            dtWindowHeight = windowPosition.height;
            dtWindowWidth = windowPosition.width;
          }
        } else 
        { // If a previously opened plugin instance has been closed, restore it
          if (lastSavedPosition && lastSavedPosition.left && lastSavedPosition.height)
          {
            nextLeft = lastSavedPosition.left;
            nextTop = lastSavedPosition.top;
            dtWindowHeight = lastSavedPosition.height;
            dtWindowWidth = lastSavedPosition.width;
          }
      }
    } else { // If a plugin of the same type is not running, but has previously saved position data, re-open it
      let windowPosition = {
        ...this.getWindowPositionFromId(pluginIdentifier),
      } as WindowPosition
      if (windowPosition && windowPosition.left && windowPosition.height) {
        return windowPosition;
      }
    }

    // When cascade has reached too far down or too far to the right, start again from 1, 1
    if (nextLeft > rightMostPosition || nextTop > (bottomMostPosition - launchbarHeight)) {
      nextLeft = 1;
      nextTop = 1;
    }

    /* We've chosen the best position based on history and requested window size, now we
     * adjust window size if necessary */

    if (nextLeft > rightMostPosition) {
      const newWidth = innerWidth - nextLeft;
      this.logger.debug("ZWED5318I", dtWindowWidth, newWidth, nextLeft, innerWidth); //this.logger.debug(`reducing width from ${dtWindowWidth} to ${newWidth} based on nextLeft ${nextLeft} and innerWidth ${innerWidth}`);
      dtWindowWidth = newWidth;
    }

    if (nextTop > bottomMostPosition) {
      const newHeight = innerHeight - nextTop;
      this.logger.debug("ZWED5319I", dtWindowHeight, newHeight, nextTop, innerHeight); //this.logger.debug(`reducing height from ${dtWindowHeight} to ${newHeight} based on nextTop ${nextTop} and innerHeight ${innerHeight}`);
      dtWindowHeight = newHeight;
    }

    const newWindowPosition: WindowPosition = {
      left: nextLeft,
      top: nextTop,
      width: dtWindowWidth,
      height: dtWindowHeight
    };

    return newWindowPosition;
  }

  private generateWindowEventsProvider(windowId: MVDWindowManagement.WindowId): Angular2PluginWindowEvents {
    const events = this.getWindowEvents(windowId);

    return {
      maximized: events.windowMaximized,
      minimized: events.windowMinimized,
      restored: events.windowRestored,
      moved: events.windowMoved,
      resized: events.windowResized,
      titleChanged: events.windowTitleChanged
    };
  }

  private generateWindowActionsProvider(windowId: MVDWindowManagement.WindowId): Angular2PluginWindowActions {
    return {
      close: () => this.closeWindow(windowId),
      minimize: () => this.minimize(windowId),
      maximize: () => this.maximize(windowId),
      restore: () => this.restore(windowId),
      setTitle: (title) => this.setWindowTitle(windowId, title),
      setPosition: (pos) => this.setPosition(windowId, pos),
      spawnContextMenu: (xPos, yPos, items, isAbsolutePos?:boolean) => this.spawnContextMenu(windowId, xPos, yPos, items, isAbsolutePos),
      registerCloseHandler: (handler)=> this.registerCloseHandler(windowId, handler)
    };
  }

  private generateViewportEventsProvider(windowId: MVDWindowManagement.WindowId, viewportId: MVDHosting.ViewportId): Angular2PluginViewportEvents {
    const events = this.getWindowEvents(windowId);

    return {
      resized: events.windowResized,
      spawnContextMenu: (xPos, yPos, items, isAbsolutePos?:boolean) => this.spawnContextMenu(windowId, xPos, yPos, items, isAbsolutePos),
      registerCloseHandler: (handler) => this.viewportManager.registerViewportCloseHandler(viewportId, handler)
    };
  }

  private generateEmbedAction(windowId: MVDWindowManagement.WindowId): Angular2PluginEmbedActions {
    return {
      createEmbeddedInstance: (identifier: string, launchMetadata: any, viewContainer: ViewContainerRef): Promise<EmbeddedInstance> => {
        return this.pluginManager.findPluginDefinition(identifier).then((plugin): InstanceId => {
          if (plugin == null) {
            throw new Error('ZWED5154E - No matching plugin definition found');
          }

          const factory = this.componentFactoryResolver.resolveComponentFactory(ViewportComponent);
          const componentRef: ComponentRef<ViewportComponent> = viewContainer.createComponent(factory, viewContainer.length);

          const viewportComponent = componentRef.instance;


          viewportComponent.viewportId = this.viewportManager.createViewport((viewportId: MVDHosting.ViewportId)=> {
            const providers: Map<string, any> = new Map();
            providers.set(Angular2InjectionTokens.VIEWPORT_EVENTS, this.generateViewportEventsProvider(windowId, viewportId));
            providers.set(Angular2InjectionTokens.PLUGIN_EMBED_ACTIONS, this.generateEmbedAction(windowId));
            return providers;
          });
          const viewportId = viewportComponent.viewportId;
          const desktopWindow = this.windowMap.get(windowId);
          if (desktopWindow) {
            desktopWindow.addChildViewport(viewportId);
          }
          return this.applicationManager.spawnApplicationWithTarget(plugin, launchMetadata, viewportComponent.viewportId)
            .then(instanceId => (<EmbeddedInstance>{instanceId, viewportId}));
        });
      }
    };
  }

  public launchDesktopAutoSavedApplications(){
    this.http.get<any>(ZoweZLUX.uriBroker.pluginConfigUri(ZoweZLUX.pluginManager.getDesktopPlugin(),'pluginData/app', undefined)).subscribe(res => {
      if(res){
        for (let pluginWindow in res.contents){
          let pluginName = pluginWindow.split('-')[0] 
          this.applicationManager.spawnApplication(new DesktopPluginDefinitionImpl(ZoweZLUX.pluginManager.getPlugin(pluginName)),{"data":{"type":"setAppRequest","actionType":"Launch","targetMode":"PluginCreate","appData":res.contents[pluginWindow].data.appData}})
          
         this.autoSaveDataClean = true;
        }
      }
    });
  }

  private savePluginData(plugin:ZLUX.Plugin,windowId:number,data:any){
    let pathToSave : any = 'pluginData' + '/' + 'app'
    let fileNameToSave : string = plugin.getIdentifier() + '-' + windowId
    if(this.autoSaveDataClean){
      this.http.delete(ZoweZLUX.uriBroker.pluginConfigUri(ZoweZLUX.pluginManager.getDesktopPlugin(),'pluginData/app',undefined)).subscribe(()=>
              this.logger.info('Deleted AutoSaveData for Desktop Plugins')
      )
      this.autoSaveDataClean = false;
    }
    if(this.autoSaveFiles[fileNameToSave] !== undefined){
      this.http.put<any>(ZoweZLUX.uriBroker.pluginConfigUri(ZoweZLUX.pluginManager.getDesktopPlugin(),pathToSave,fileNameToSave+'&lastmod='+this.autoSaveFiles[fileNameToSave]), data).subscribe(res => {
        this.autoSaveFiles[fileNameToSave] = res.maccessms 
        this.logger.info('Saved data for plugin:',plugin.getIdentifier())
      })
    }else{
      this.http.put<any>(ZoweZLUX.uriBroker.pluginConfigUri(ZoweZLUX.pluginManager.getDesktopPlugin(),pathToSave,fileNameToSave), data).subscribe(res => {
        this.autoSaveFiles[fileNameToSave] = res.maccessms 
        this.logger.info('Saved data for plugin:',plugin.getIdentifier())
      })
    }
  };
  
  private generateSessionEventsProvider(windowId: MVDWindowManagement.WindowId): Angular2PluginSessionEvents {
    const login = new Subject<void>();
    const sessionExpire = new Subject<void>();
    const autosaveEmitter = new Subject<any>();
    let desktopWin: DesktopWindow|undefined = this.windowMap.get(windowId);
    if (desktopWin) {
      let plugin: ZLUX.Plugin = desktopWin.plugin;
      setInterval(()=> {
        autosaveEmitter.next((data:any)=> {
          this.savePluginData(plugin,windowId,data)
        });
      },this.autoSaveInterval); 
    }
    const sessionEvents: Angular2PluginSessionEvents = {
      login,
      sessionExpire,
      autosaveEmitter
    }
    this.sessionSubscriptions.set(windowId, sessionEvents)
    return sessionEvents
  }

  private generateWindowProviders(windowId: MVDWindowManagement.WindowId, viewportId: MVDHosting.ViewportId): Map<string, any> {
    const providers: Map<string, any> = new Map();
    providers.set(Angular2InjectionTokens.WINDOW_ACTIONS, this.generateWindowActionsProvider(windowId));
    providers.set(Angular2InjectionTokens.WINDOW_EVENTS, this.generateWindowEventsProvider(windowId));
    providers.set(Angular2InjectionTokens.VIEWPORT_EVENTS, this.generateViewportEventsProvider(windowId, viewportId));
    providers.set(Angular2InjectionTokens.PLUGIN_EMBED_ACTIONS, this.generateEmbedAction(windowId));
    providers.set(Angular2InjectionTokens.SESSION_EVENTS, this.generateSessionEventsProvider(windowId));
    providers.set(Angular2InjectionTokens.THEME_EVENTS, this.generateThemeEventsProvider());

    return providers;
  }

  // We don't use windowID's here because each app lifecycle points to one master theme service, they're indistinguishable
  private generateThemeEventsProvider(): Angular2PluginThemeEvents {
    return {
      colorChanged: this.themeService.onColorChange,
      sizeChanged: this.themeService.onSizeChange,
      wallpaperChanged: this.themeService.onWallpaperChange,
      currentColor: this.themeService.mainColor,
      currentSize: this.themeService.mainSize,
      revertedDefault: this.themeService.onResetAllDefault
    };
  }

  createWindow(plugin: MVDHosting.DesktopPluginDefinition): MVDWindowManagement.WindowId {
    /* Create window instance */
    let pluginImpl:DesktopPluginDefinitionImpl = plugin as DesktopPluginDefinitionImpl;
    const windowId = this.generateWindowId();
    const newWindowPosition: WindowPosition = this.generateNewWindowPosition(pluginImpl);
    const newState = new DesktopWindowState(this.topZIndex, newWindowPosition);
    const desktopWindow = new DesktopWindow(windowId, newState, plugin.getBasePlugin());
    this.topZIndex ++;

    /* Register window */
    this.windowMap.set(windowId, desktopWindow);

    const pluginId = plugin.getIdentifier();
    const desktopWindowIds = this.runningPluginMap.get(pluginId);
    if (desktopWindowIds !== undefined) {
      desktopWindowIds.push(windowId);
    } else {
      this.runningPluginMap.set(pluginId, [windowId]);
    }

    this.updateLastWindowPositions(pluginId, windowId, newWindowPosition);

    /* Create viewport */
    desktopWindow.viewportId = this.viewportManager.createViewport((viewportId: MVDHosting.ViewportId)=> {
      return this.generateWindowProviders(windowId, viewportId);
    });

    /* Default window actions */
    this.setWindowTitle(windowId, pluginImpl.defaultWindowTitle);
    this.requestWindowFocus(windowId);

    return windowId;
  }

  createFullscreenStandaloneWindow(plugin: MVDHosting.DesktopPluginDefinition): MVDWindowManagement.WindowId {
    /* Create window instance */
    let pluginImpl:DesktopPluginDefinitionImpl = plugin as DesktopPluginDefinitionImpl;
    const windowId = this.generateWindowId();
    const paddingMargin = 2;
    // const newWindowPosition: WindowPosition = this.generateNewWindowPosition(pluginImpl);
    const newWindowPosition: WindowPosition = {
      left: 0 - paddingMargin,
      top: 0 - 31,
      width: window.innerWidth + paddingMargin,
      height: window.innerHeight + 31
    };
    const newState = new DesktopWindowState(this.topZIndex, newWindowPosition);
    const desktopWindow = new DesktopWindow(windowId, newState, plugin.getBasePlugin());
    desktopWindow.isFullscreenStandalone = true;
    this.topZIndex ++;

    /* Register window */
    this.windowMap.set(windowId, desktopWindow);

    const pluginId = plugin.getIdentifier();
    const desktopWindowIds = this.runningPluginMap.get(pluginId);
    if (desktopWindowIds !== undefined) {
      desktopWindowIds.push(windowId);
    } else {
      this.runningPluginMap.set(pluginId, [windowId]);
    }

    this.updateLastWindowPositions(pluginId, windowId, newWindowPosition);

    /* Create viewport */
    desktopWindow.viewportId = this.viewportManager.createViewport((viewportId: MVDHosting.ViewportId)=> {
      return this.generateWindowProviders(windowId, viewportId);
    });

    /* Default window actions */
    this.setWindowTitle(windowId, pluginImpl.defaultWindowTitle);
    this.requestWindowFocus(windowId);
    this._maximizeFullscreen(windowId);

    return windowId;
  }

  getWindow(plugin: MVDHosting.DesktopPluginDefinition): MVDWindowManagement.WindowId | null {
    const desktopWindows = this.runningPluginMap.get(plugin.getIdentifier());
    if (desktopWindows !== undefined) {
      return desktopWindows[0];
    } else {
      return null;
    }
  }

  getWindowIDs(plugin: MVDHosting.DesktopPluginDefinition): Array<MVDWindowManagement.WindowId> | null {
    const desktopWindows = this.runningPluginMap.get(plugin.getIdentifier());
    if (desktopWindows !== undefined) {
      return desktopWindows.map((desktopWindow)=> {return desktopWindow/*.windowId*/;});
    } else {
      return null;
    }
  }

  showWindow(windowId: MVDWindowManagement.WindowId): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow !== undefined) {
      if (desktopWindow.windowState.stateType === DesktopWindowStateType.Minimized) {
        const previousWindowState = desktopWindow.windowState.PreviousStateType;
        this.restore(windowId);
        if (previousWindowState === DesktopWindowStateType.Maximized) {
          this.maximize(windowId);
        }
      }
    }
  }

  getViewportId(windowId: MVDWindowManagement.WindowId): MVDHosting.ViewportId {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('ZWED5155E - Attempted to retrieve viewport id of null window');
    }

    return desktopWindow.viewportId;
  }

  getHTML(windowId: MVDWindowManagement.WindowId) {
    let windowHTML = this.applicationManager.getViewportComponentRef(this.getViewportId(windowId)).location.nativeElement;

    return windowHTML.children[0].offsetParent
  }

  getPlugin(windowId: MVDWindowManagement.WindowId) {
    const desktopWindow = this.windowMap.get(windowId);
    var plugin = this.runningPluginMap.get(desktopWindow!.plugin.getIdentifier());
    return plugin;
  }

  private destroyWindow(windowId: MVDWindowManagement.WindowId): void {
    this.sessionSubscriptions.delete(windowId);
    this.windowDeregisterEmitter.next(windowId);
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow != undefined) {
      this.windowMap.delete(windowId);
      let windowIDs = this.runningPluginMap.get(desktopWindow.plugin.getIdentifier());
      if (windowIDs){
        var index = windowIDs.indexOf(windowId);
        if(index!=-1){
          windowIDs.splice(index, 1);
        }
        this.runningPluginMap.set(desktopWindow.plugin.getIdentifier(),windowIDs);
      }
    }
  }

  closeWindow(windowId: MVDWindowManagement.WindowId): void {
    const desktopWindow = this.windowMap.get(windowId);
    // We should not be able to close a standalone mode application window
    if(desktopWindow && desktopWindow.isFullscreenStandalone) {
      this.logger.warn("ZWED5198W", windowId); //this.logger.warn(`Attempted to close standalone mode app window, ID=${windowId}`);
      return;
    }
    if (desktopWindow == null) {
      this.logger.warn("ZWED5181W", windowId); //this.logger.warn(`Attempted to close null window, ID=${windowId}`);
      return;
    }
    this.updateLastWindowPositions(desktopWindow.plugin.getIdentifier(), windowId, desktopWindow.windowState.position);

    const closeViewports = ()=> {
      desktopWindow.closeViewports(this.viewportManager).then(()=> {
        if (appId!=null) {
          let filePath : any = 'pluginData' + '/' + 'app'
          let fileNameToDelete : string = desktopWindow.plugin.getIdentifier() + '-' + appId
          if(this.autoSaveFileAllowDelete && desktopWindow.plugin.getWebContent().autosave == true){
            this.http.delete(ZoweZLUX.uriBroker.pluginConfigUri(ZoweZLUX.pluginManager.getDesktopPlugin(),filePath,fileNameToDelete)).subscribe(()=>
            this.logger.info('Deleted AutoSaveData for plugin:',desktopWindow.plugin.getIdentifier())
          );
          }
          this.applicationManager.killApplication(desktopWindow.plugin, appId);
        }
        this.destroyWindow(windowId);
        this.setDesktopTitle();
      }).catch((info:any)=> {
        this.logger.warn("ZWED5182W", info); //this.logger.warn(`Window could not be closed because of viewport. Details=`,info);
        return;
      }); 
    }

    let appId = this.viewportManager.getApplicationInstanceId(desktopWindow.viewportId);
    if (desktopWindow.closeHandler != null) {
      desktopWindow.closeHandler().then(()=>{closeViewports();});
    } else {
      closeViewports();
    }

    this.focusedWindow = null;
  }

  closeAllWindows() :void {
    let windows: DesktopWindow[] = Array.from(this.windowMap.values());
    windows.forEach((window: DesktopWindow)=> {
      this.closeWindow(window.windowId);
    });
    this.setDesktopTitle();
  }

  registerCloseHandler(windowId: MVDWindowManagement.WindowId, handler: () => Promise<void>): void {
    this.logger.warn("ZWED5183W"); //this.logger.warn(`windowActions.registerCloseHandler is deprecated. Please use viewportEvents.registerCloseHandler instead.`);
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      this.logger.warn("ZWED5184W", windowId); //this.logger.warn('Attempted to register close handler for null window, ID=${windowId}');
      return;
    }

    desktopWindow.closeHandler = handler;
  }

  getWindowTitle(windowId: MVDWindowManagement.WindowId): string | null {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      this.logger.warn("ZWED5185W", windowId); //this.logger.warn('Attempted to set window title for null window, ID=${windowId}');
      return null;
    }
    return desktopWindow.windowTitle;
  }

  setWindowTitle(windowId: MVDWindowManagement.WindowId, title: string): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      this.logger.warn("ZWED5186W", windowId); //this.logger.warn('Attempted to set window title for null window, ID=${windowId}');
      return;
    }

    desktopWindow.windowTitle = title;
    this.setDesktopTitle(desktopWindow.windowTitle);
  }

  requestWindowFocus(destination: MVDWindowManagement.WindowId): boolean {
    const desktopWindow = this.windowMap.get(destination);
    if (desktopWindow == null) {
      this.logger.warn("ZWED5187W", destination); //this.logger.warn('Attempted to request focus for null window, ID=${destination}');
      return false;
    }
    //let requestScreenshot = false;
    //if (!this.windowHasFocus(destination) && this._lastScreenshotWindowId != destination){
      //requestScreenshot = true;
    //}

    //can't focus an unseen window!
    if (desktopWindow.windowState.stateType === DesktopWindowStateType.Minimized) {
      this.restore(destination);
    }

    this.focusedWindow = desktopWindow;
    desktopWindow.windowState.zIndex = this.topZIndex ++;
    // TODO: Generate snapshot code needs optimization due to incredible desktop performance slowdown
    // if (requestScreenshot){
    //   setTimeout(()=> {
    //     this.screenshotRequestEmitter.next({pluginId: this._lastScreenshotPluginId, windowId: this._lastScreenshotWindowId});
    //     this._lastScreenshotWindowId = destination;
    //     this._lastScreenshotPluginId = desktopWindow.plugin.getIdentifier();
    //   },500); //delay a bit for performance perception
    // }
    this.setDesktopTitle(desktopWindow.windowTitle);
    return true;
  }

  windowHasFocus(window: MVDWindowManagement.WindowId): boolean {
    if (this.focusedWindow) {
      return this.focusedWindow.windowId === window;
    } else {
      return false;
    }
  }

  getWindowEvents(windowId: MVDWindowManagement.WindowId): LocalWindowEvents {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('ZWED5156E - Attempted to get window events for null window');
    }

    return desktopWindow.localWindowEvents;
  }

  maximize(windowId: MVDWindowManagement.WindowId): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('ZWED5157E - Attempted to maximize null window');
    }

    desktopWindow.windowState.maximize();
    this.refreshMaximizedWindowSize(desktopWindow);
  }

  private _maximizeFullscreen(windowId: MVDWindowManagement.WindowId): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('ZWED5157E - Attempted to maximize null window');
    }

    desktopWindow.windowState._maximizeFullscreen();
  }

  minimize(windowId: MVDWindowManagement.WindowId): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('ZWED5158E - Attempted to minimize null window');
    }

    desktopWindow.windowState.minimize();
  }

  restore(windowId: MVDWindowManagement.WindowId): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('ZWED5159E - Attempted to restore null window');
    }
    desktopWindow.windowState.restore();
    this.updateLastWindowPositions(desktopWindow.plugin.getIdentifier(), windowId, desktopWindow.windowState.position);
  }

  setPosition(windowId: MVDWindowManagement.WindowId, pos: WindowPosition): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('ZWED5160E - Attempted to set position for null window');
    }
    //TODO(?): It seems like this method is never being used. The only method used to set position of a
    //window is positionStyle() in window.component.ts --- this.logger.info("Set position used here!");
    desktopWindow.windowState.position = pos;
    this.updateLastWindowPositions(desktopWindow.plugin.getIdentifier(), windowId, desktopWindow.windowState.position);
  }

  updateLastWindowPositions(pluginId: String, windowId: MVDWindowManagement.WindowId, pos: WindowPosition): boolean {
    let positionMap = this.lastWindowPositionMap.get(pluginId);
    if (positionMap) {
      let windowPosition = positionMap.get(windowId);
      if (windowPosition) {
        positionMap.set(windowId, pos);
        this.lastWindowPositionMap.set(pluginId, positionMap);
        return true; // Returns if true if existing position data has been overwritten
      }
    }
    positionMap = new Map();
    positionMap.set(windowId, pos);
    this.lastWindowPositionMap.set(pluginId, positionMap);
    return false; // Returns false if a new position data point was created
  }

  getWindowPositionFor(pluginId: String, windowId: MVDWindowManagement.WindowId): WindowPosition | null {
    let positionMap = this.lastWindowPositionMap.get(pluginId);
    if (positionMap)
    {
      let windowPosition = positionMap.get(windowId);
      if (windowPosition)
      {
        return windowPosition;
      }
    }
    return null;
  }

  getWindowPositionFromId(pluginId: String): WindowPosition | null {
    let positionMap = this.lastWindowPositionMap.get(pluginId);
    if (positionMap)
    {
      let IDsMap = Array.from(positionMap.keys());
      if (IDsMap.length >= 0)
      {
        IDsMap.sort();
        let windowPosition = positionMap.get(IDsMap[IDsMap.length - 1]);
        if (windowPosition)
        {
          return windowPosition;
        }
      }
    }
    return null;
  }

  maximizeToggle(windowId: MVDWindowManagement.WindowId): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('ZWED5161E - Attempted to maximize toggle null window');
    }

    const stateType = desktopWindow.windowState.stateType;

    switch (stateType) {
      case DesktopWindowStateType.Minimized:
        this.maximize(windowId);
        break;
      case DesktopWindowStateType.Maximized:
        this.restore(windowId);
        break;
      case DesktopWindowStateType.Normal:
        this.maximize(windowId);
        break;
    }
  }

  minimizeToggle(windowId: MVDWindowManagement.WindowId): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('ZWED5162E - Attempted to minimize toggle null window');
    }

    const stateType = desktopWindow.windowState.stateType;

    switch (stateType) {
      case DesktopWindowStateType.Minimized:
        this.restore(windowId);
        break;
      case DesktopWindowStateType.Maximized:
        this.minimize(windowId);
        break;
      case DesktopWindowStateType.Normal:
        this.minimize(windowId);
        break;
    }
  }

  spawnContextMenu(windowId: MVDWindowManagement.WindowId, x: number, y: number, items: ContextMenuItem[], isAbsolutePos?: boolean): boolean {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('ZWED5163E - Attempted to spawn context menu for null window');
    }
    const windowPos = desktopWindow.windowState.position;
    const newX = isAbsolutePos ? x : windowPos.left + x;
    const newY = isAbsolutePos ? y : windowPos.top + y + WindowManagerService.WINDOW_HEADER_HEIGHT;
    this.contextMenuRequested.next({xPos: newX, yPos: newY, items: items});   
    return true; 
  }

  setDesktopTitle(title?:String) {
    // TODO: Abstract app count to new function
    /* const appCount = this.runningPluginMap.size;*/
    let newTitle = DEFAULT_DESKTOP_TITLE;
    if(title) {
      newTitle=[DEFAULT_DESKTOP_SHORT_TITLE, /*appCount + ' Apps',*/ title].join(' | ');
    }
    document.title = newTitle;
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

