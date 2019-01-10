

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, ViewContainerRef, ComponentRef, ComponentFactoryResolver, Injector } from '@angular/core';
import { Subject } from 'rxjs/Subject';

import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { ViewportComponent } from 'app/application-manager/viewport-manager/viewport/viewport.component';
//import { AppPropertiesWindowComponent } from '../propertieswindow/app-properties-window.component';

import { DesktopWindow, LocalWindowEvents } from './desktop-window';
import { WindowPosition } from './window-position';
import { DesktopWindowState, DesktopWindowStateType } from '../shared/desktop-window-state';
import { WindowMonitor } from 'app/shared/window-monitor.service';
import { ContextMenuItem, Angular2PluginWindowActions,
  Angular2PluginWindowEvents, Angular2InjectionTokens, Angular2PluginViewportEvents, Angular2PluginEmbedActions, InstanceId, EmbeddedInstance
} from 'pluginlib/inject-resources';

type PluginIdentifier = string;

@Injectable()
export class WindowManagerService implements MVDWindowManagement.WindowManagerServiceInterface {

  /*
   * I'd like to apply this constant to the ".window .header" selector in ../window/window.component.css
   * but I don't know how
   */
  public static readonly WINDOW_HEADER_HEIGHT = 45;
  private static readonly NEW_WINDOW_POSITION_INCREMENT = WindowManagerService.WINDOW_HEADER_HEIGHT;

  private nextId: MVDWindowManagement.WindowId;
  private windowMap: Map<MVDWindowManagement.WindowId, DesktopWindow>;
  private runningPluginMap: Map<PluginIdentifier, MVDWindowManagement.WindowId[]>;

  private focusedWindow: DesktopWindow | null;
  private topZIndex: number;
  /*
   * NOTES:
   * 1. We ignore the width and height here (I am reluctant to make a new data type just for this,
   *    plus I don't want to make width and height optional)
   * 2. Even though this looks like it starts at (0.0), doing this simplifies the logic of
   *    generateNewWindowPosition whuile still starting off at (NEW_WINDOW_POSITION_INCREMENT, NEW_WINDOW_POSITION_INCREMENT)
   */
  private windowPositionsMap: Map<String, Map<MVDWindowManagement.WindowId, WindowPosition>>;

  contextMenuRequested: Subject<{xPos: number, yPos: number, items: ContextMenuItem[]}>;
  readonly windowDeregisterEmitter: Subject<MVDWindowManagement.WindowId>;
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  private viewportManager: MVDHosting.ViewportManagerInterface;
  private pluginManager: MVDHosting.PluginManagerInterface;

  constructor(
    private injector: Injector,
    private windowMonitor: WindowMonitor,
    private componentFactoryResolver: ComponentFactoryResolver
  ) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
    this.viewportManager = this.injector.get(MVDHosting.Tokens.ViewportManagerToken);
    this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
    this.nextId = 0;
    this.windowMap = new Map();

    this.runningPluginMap = new Map();

    
    this.focusedWindow = null;
    this.topZIndex = 0;
    this.windowPositionsMap = new Map();
    this.contextMenuRequested = new Subject();
    this.windowDeregisterEmitter = new Subject();

    this.windowMonitor.windowResized.subscribe(() => {
      Array.from(this.windowMap.values())
        .filter(win => win.windowState.stateType === DesktopWindowStateType.Maximized)
        .forEach(win => this.refreshMaximizedWindowSize(win));
    });
  }

  /* TODO: https://github.com/angular/angular/issues/17725 gets in the way */
  getAllWindows(): DesktopWindow[] {
    return Array.from(this.windowMap.values());
  }

 
  private refreshMaximizedWindowSize(desktopWindow: DesktopWindow): void {
    desktopWindow.windowState.position = { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
  }

  private generateWindowId(): MVDWindowManagement.WindowId {
    return this.nextId ++;
  }

  private generateNewWindowPosition(plugin: DesktopPluginDefinitionImpl): WindowPosition {
    let { width: dtWindowWidth, height: dtWindowHeight } = plugin.defaultWindowStyle;
    let desktopHeight = document.getElementsByClassName('window-pane')[0].clientHeight;
    let desktopWidth = document.getElementsByClassName('window-pane')[0].clientWidth;
    let launchbarHeight = document.getElementsByClassName('launchbar-container')[0].clientHeight;
    let nextLeft = (desktopWidth / 2) - (dtWindowWidth / 2);
    let nextTop = (desktopHeight / 2) - (dtWindowHeight / 2) - (WindowManagerService.WINDOW_HEADER_HEIGHT / 2) - (launchbarHeight / 2);
    
    const { innerWidth, innerHeight } = window;
    const rightMostPosition = innerWidth - dtWindowWidth;
    const bottomMostPosition = innerHeight - dtWindowHeight;
    const pluginIdentifier = plugin.getIdentifier();
    
    if (this.runningPluginMap.get(pluginIdentifier) != undefined && this.runningPluginMap.get(pluginIdentifier)!.length > 0)
    { 
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
    }
    else 
    { // If a plugin of the same type is not running, but has previously saved position data, re-open it
      let windowPosition = {
        ...this.getWindowPositionFromId(pluginIdentifier),
      } as WindowPosition
      if (windowPosition && windowPosition.left && windowPosition.height)
        {
          return windowPosition;
        }
    }

    // Find best next starting position
    if (nextLeft > rightMostPosition) { // Start over both top and left
      nextLeft = WindowManagerService.NEW_WINDOW_POSITION_INCREMENT;
      nextTop = WindowManagerService.NEW_WINDOW_POSITION_INCREMENT;
    } else if  (nextTop > bottomMostPosition) { // Just start from the top, keep moving right
      nextTop = WindowManagerService.NEW_WINDOW_POSITION_INCREMENT;
    }

    /* We've chosen the best position based on history and requested window size, now we
     * adjust window size if necessary */

    if (nextLeft > rightMostPosition) {
      const newWidth = innerWidth - nextLeft;
      console.log(`reducing width from ${dtWindowWidth} to ${newWidth} based on nextLeft ${nextLeft} and innerWidth ${innerWidth}`);
      dtWindowWidth = newWidth;
    }

    if (nextTop > bottomMostPosition) {
      const newHeight = innerHeight - nextTop;
      console.log(`reducing height from ${dtWindowHeight} to ${newHeight} based on nextTop ${nextTop} and innerHeight ${innerHeight}`);
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
      spawnContextMenu: (xRel, yRel, items) => this.spawnContextMenu(windowId, xRel, yRel, items),
      registerCloseHandler: (handler) => this.registerCloseHandler(windowId, handler)
    };
  }

  private generateViewportEventsProvider(windowId: MVDWindowManagement.WindowId): Angular2PluginViewportEvents {
    const events = this.getWindowEvents(windowId);

    return {
      resized: events.windowResized
    };
  }

  private generateEmbedAction(windowId: MVDWindowManagement.WindowId): Angular2PluginEmbedActions {
    return {
      createEmbeddedInstance: (identifier: string, launchMetadata: any, viewContainer: ViewContainerRef): Promise<EmbeddedInstance> => {
        return this.pluginManager.findPluginDefinition(identifier).then((plugin): InstanceId => {
          if (plugin == null) {
            throw new Error('No matching plugin definition found');
          }

          const factory = this.componentFactoryResolver.resolveComponentFactory(ViewportComponent);
          const componentRef: ComponentRef<ViewportComponent> = viewContainer.createComponent(factory, viewContainer.length);

          const viewportComponent = componentRef.instance;

          const providers: Map<string, any> = new Map();
          providers.set(Angular2InjectionTokens.VIEWPORT_EVENTS, this.generateViewportEventsProvider(windowId));
          providers.set(Angular2InjectionTokens.PLUGIN_EMBED_ACTIONS, this.generateEmbedAction(windowId));

          viewportComponent.viewportId = this.viewportManager.createViewport(providers);
          const viewportId = viewportComponent.viewportId;
          return this.applicationManager.spawnApplicationWithTarget(plugin, launchMetadata, viewportComponent.viewportId)
            .then(instanceId => (<EmbeddedInstance>{instanceId, viewportId}));
        });
      }
    };
  }

  private generateWindowProviders(windowId: MVDWindowManagement.WindowId): Map<string, any> {
    const providers: Map<string, any> = new Map();

    providers.set(Angular2InjectionTokens.WINDOW_ACTIONS, this.generateWindowActionsProvider(windowId));
    providers.set(Angular2InjectionTokens.WINDOW_EVENTS, this.generateWindowEventsProvider(windowId));
    providers.set(Angular2InjectionTokens.VIEWPORT_EVENTS, this.generateViewportEventsProvider(windowId));
    providers.set(Angular2InjectionTokens.PLUGIN_EMBED_ACTIONS, this.generateEmbedAction(windowId));

    return providers;
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
    
    this.updateWindowPositions(pluginId, windowId, newWindowPosition);

    /* Create viewport */
    const viewportId = this.viewportManager.createViewport(this.generateWindowProviders(windowId));
    desktopWindow.viewportId = viewportId;

    /* Default window actions */
    this.setWindowTitle(windowId, pluginImpl.defaultWindowTitle);
    this.requestWindowFocus(windowId);

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
      this.requestWindowFocus(windowId);
    }
  }

  getViewportId(windowId: MVDWindowManagement.WindowId): MVDHosting.ViewportId {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('Attempted to retrieve viewport id of null window');
    }

    return desktopWindow.viewportId;
  }

  private destroyWindow(windowId: MVDWindowManagement.WindowId): void {
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
    if (desktopWindow == null) {
      console.warn('Attempted to close null window');
      return;
    }
    this.updateWindowPositions(desktopWindow.plugin.getIdentifier(), windowId, desktopWindow.windowState.position);
       
    let appId = this.viewportManager.getApplicationInstanceId(desktopWindow.viewportId);
    if (appId!=null) {
      this.applicationManager.killApplication(desktopWindow.plugin, appId);
    }
    if (desktopWindow.closeHandler != null) {
      desktopWindow.closeHandler().then(() => this.destroyWindow(windowId));
    } else {
      this.destroyWindow(windowId);
    }
  }

  closeAllWindows() :void {
    let windows: DesktopWindow[] = Array.from(this.windowMap.values());
    windows.forEach((window: DesktopWindow)=> {
      this.closeWindow(window.windowId);
    });
  }

  registerCloseHandler(windowId: MVDWindowManagement.WindowId, handler: () => Promise<void>): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      console.warn('Attempted to register close handler for null window');
      return;
    }

    desktopWindow.closeHandler = handler;
  }

  setWindowTitle(windowId: MVDWindowManagement.WindowId, title: string): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      console.warn('Attempted to set window title for null window');
      return;
    }

    desktopWindow.windowTitle = title;
  }

  requestWindowFocus(destination: MVDWindowManagement.WindowId): boolean {
    const desktopWindow = this.windowMap.get(destination);
    if (desktopWindow == null) {
      console.warn('Attempted to request focus for null window');
      return false;
    }

    this.focusedWindow = desktopWindow;
    desktopWindow.windowState.zIndex = this.topZIndex ++;

    return true;
  }

  windowHasFocus(window: MVDWindowManagement.WindowId): boolean {
    if (this.focusedWindow != null) {
      return this.focusedWindow.windowId === window;
    } else {
      return false;
    }
  }

  getWindowEvents(windowId: MVDWindowManagement.WindowId): LocalWindowEvents {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('Attempted to get window events for null window');
    }

    return desktopWindow.localWindowEvents;
  }

  maximize(windowId: MVDWindowManagement.WindowId): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('Attempted to maximize null window');
    }

    desktopWindow.windowState.maximize();
    this.refreshMaximizedWindowSize(desktopWindow);
    this.updateWindowPositions(desktopWindow.plugin.getIdentifier(), windowId, desktopWindow.windowState.position);

  }

  minimize(windowId: MVDWindowManagement.WindowId): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('Attempted to minimize null window');
    }

    desktopWindow.windowState.minimize();
  }

  restore(windowId: MVDWindowManagement.WindowId): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('Attempted to restore null window');
    }
    this.updateWindowPositions(desktopWindow.plugin.getIdentifier(), windowId, desktopWindow.windowState.position);
  
    desktopWindow.windowState.restore();
  }

  setPosition(windowId: MVDWindowManagement.WindowId, pos: WindowPosition): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('Attempted to set position for null window');
    }
    this.updateWindowPositions(desktopWindow.plugin.getIdentifier(), windowId, desktopWindow.windowState.position);
    //TODO(?): It seems like this method is never being used. The only method used to set position of a
    //window is positionStyle() in window.component.ts --- console.log("Set position used here!");
    desktopWindow.windowState.position = pos;
  }

  updateWindowPositions(pluginId: String, windowId: MVDWindowManagement.WindowId, pos: WindowPosition): boolean {
    let positionMap = this.windowPositionsMap.get(pluginId);
    if (positionMap)
    {
      let windowPosition = positionMap.get(windowId);
      if (windowPosition)
      {
        positionMap.set(windowId, pos);
        this.windowPositionsMap.set(pluginId, positionMap);
        return true; // Returns if true if existing position data has been overwritten
      }
    }
    positionMap = new Map();
    positionMap.set(windowId, pos);
    this.windowPositionsMap.set(pluginId, positionMap);
    return false; // Returns false if a new position data point was created
  }

  getWindowPositionFor(pluginId: String, windowId: MVDWindowManagement.WindowId): WindowPosition | null {
    let positionMap = this.windowPositionsMap.get(pluginId);
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
    let positionMap = this.windowPositionsMap.get(pluginId);
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
      throw new Error('Attempted to maximize toggle null window');
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
      throw new Error('Attempted to minimize toggle null window');
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

  spawnContextMenu(windowId: MVDWindowManagement.WindowId, xRelative: number, yRelative: number, items: ContextMenuItem[]): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('Attempted to spawn context menu for null window');
    }

    const newX = desktopWindow.windowState.position.left + xRelative;
    const newY = desktopWindow.windowState.position.top + yRelative + WindowManagerService.WINDOW_HEADER_HEIGHT;

    this.contextMenuRequested.next({xPos: newX, yPos: newY, items: items});
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

