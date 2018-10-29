

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
  private lastWindowPosition: WindowPosition;

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
    this.lastWindowPosition = {left: 0, top: 0, width: 400, height: 400 / 1.6};
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
    const { innerWidth, innerHeight } = window;
    let { width: dtWindowWidth, height: dtWindowHeight } = plugin.defaultWindowStyle;
    const rightMostPosition = innerWidth - dtWindowWidth;
    const bottomMostPosition = innerHeight - dtWindowHeight;

    const { left: lastTopLeft, top: lastTopRight } = this.lastWindowPosition;
    let nextLeft = lastTopLeft + WindowManagerService.NEW_WINDOW_POSITION_INCREMENT;
    let nextTop = lastTopRight + WindowManagerService.NEW_WINDOW_POSITION_INCREMENT;

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

    this.lastWindowPosition = newWindowPosition;

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

  getWindowIDs(plugin: MVDHosting.DesktopPluginDefinition): Array<MVDWindowManagement.WindowId> | null {
    const desktopWindows = this.pluginMap.get(plugin.getIdentifier());
    if (desktopWindows !== undefined) {
      return desktopWindows.map((desktopWindow)=> {return desktopWindow.windowId;});
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
    if (desktopWindow !== undefined) {
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

  registerCloseHandler(windowId: MVDWindowManagement.WindowId, handler: () => Promise<void>): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      console.warn('Attempted to register close handler for null window');
      return;
    }

    desktopWindow.closeHandler = handler;
  }

  getWindowTitle(windowId: MVDWindowManagement.WindowId): string | null {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      console.warn('Attempted to set window title for null window');
      return null;
    }
    return desktopWindow.windowTitle;
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

    desktopWindow.windowState.restore();
  }

  setPosition(windowId: MVDWindowManagement.WindowId, pos: WindowPosition): void {
    const desktopWindow = this.windowMap.get(windowId);
    if (desktopWindow == null) {
      throw new Error('Attempted to set position for null window');
    }

    desktopWindow.windowState.position = pos;
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

