

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector, EventEmitter } from '@angular/core';
// import { DesktopPluginDefinition } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { ViewportManager } from 'app/application-manager/viewport-manager/viewport-manager.service';
import { ContextMenuItem, Angular2InjectionTokens, Angular2PluginViewportEvents } from 'pluginlib/inject-resources';
import { BaseLogger } from 'virtual-desktop-logger';
import { Subject } from 'rxjs/Subject';

@Injectable()
export class SimpleWindowManagerService implements MVDWindowManagement.WindowManagerServiceInterface {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private theViewportId: MVDHosting.ViewportId;
  readonly windowResized: EventEmitter<{ width: number, height: number }>;
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  private pluginDef: MVDHosting.DesktopPluginDefinition;

  contextMenuRequested: Subject<{xPos: number, yPos: number, items: ContextMenuItem[]}>;
  
  constructor(
    private viewportManager: ViewportManager,
    private injector: Injector
  ) {
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
    this.windowResized = new EventEmitter<{ width: number, height: number }>(true);
    this.contextMenuRequested = new Subject();
    window.addEventListener('resize', () => this.onResize(), false);
  }

  createWindow(plugin: MVDHosting.DesktopPluginDefinition): MVDWindowManagement.WindowId {
    let windowId = 1;
    this.pluginDef = plugin;
    this.theViewportId = this.viewportManager.createViewport((viewportId: MVDHosting.ViewportId)=> {
      return this.generateWindowProviders(windowId, viewportId);
    });
    return windowId;
  }

  getWindow(plugin: MVDHosting.DesktopPluginDefinition): MVDWindowManagement.WindowId | null {
    return 1;
  }

  /* This likely does nothing right now and that's ok since the simple window manager is quite trivial*/
  closeWindow(windowId: MVDWindowManagement.WindowId): void {
    let appId = this.viewportManager.getApplicationInstanceId(this.theViewportId);
    if (appId!=null) {
      this.applicationManager.killApplication(this.pluginDef.getBasePlugin(), appId);
    }
  }

  closeAllWindows(): void {
    this.closeWindow(1);
  }

  showWindow(windowId: MVDWindowManagement.WindowId): void {
  }

  requestWindowFocus(windowId: MVDWindowManagement.WindowId): boolean {
    return true; //Dummy logic to avoid interface implementation errors for simple window service
  }

  getViewportId(windowId: MVDWindowManagement.WindowId): MVDHosting.ViewportId {
    return this.theViewportId;
  }

  spawnContextMenu(windowId: MVDWindowManagement.WindowId, xRelative: number, yRelative: number, items: ContextMenuItem[]): boolean {
    this.contextMenuRequested.next({xPos: xRelative, yPos: yRelative, items: items});
    return true;
  }
    
  private generateWindowProviders(windowId: MVDWindowManagement.WindowId, viewportId: MVDHosting.ViewportId): Map<string, any> {
    const providers: Map<string, any> = new Map();
    providers.set(Angular2InjectionTokens.VIEWPORT_EVENTS, this.generateViewportEventsProvider(windowId, viewportId));

    return providers;
  }

  private generateViewportEventsProvider(windowId: MVDWindowManagement.WindowId, viewportId: MVDHosting.ViewportId): Angular2PluginViewportEvents {
    return {
      resized: this.windowResized,
      spawnContextMenu: (xRel, yRel, items) => this.spawnContextMenu(windowId, xRel, yRel, items),
      registerCloseHandler: (handler: ()=>Promise<any>) => this.viewportManager.registerViewportCloseHandler(viewportId, handler)
    };
  }

  private onResize() {
    const wh = { width: document.body.clientWidth, height: document.body.clientHeight };
    this.logger.debug('onresize', JSON.stringify(wh));
    this.windowResized.emit(wh);
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

