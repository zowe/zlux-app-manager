

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, EventEmitter } from '@angular/core';
// import { DesktopPluginDefinition } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { ViewportManager } from 'app/application-manager/viewport-manager/viewport-manager.service';
import { Angular2InjectionTokens, Angular2PluginViewportEvents } from 'pluginlib/inject-resources';

@Injectable()
export class SimpleWindowManagerService implements MVDWindowManagement.WindowManagerServiceInterface {
  private theViewportId: MVDHosting.ViewportId;
  readonly windowResized: EventEmitter<{ width: number, height: number }>;

  constructor(
    private viewportManager: ViewportManager
  ) {
    this.windowResized = new EventEmitter<{ width: number, height: number }>(true);
    window.addEventListener('resize', () => this.onResize(), false);
  }

  createWindow(plugin: MVDHosting.DesktopPluginDefinition): MVDWindowManagement.WindowId {
    this.theViewportId = this.viewportManager.createViewport(this.generateWindowProviders());
    return 1;
  }

  getWindow(plugin: MVDHosting.DesktopPluginDefinition): MVDWindowManagement.WindowId | null {
    return 1;
  }

  showWindow(windowId: MVDWindowManagement.WindowId): void {
  }

  getViewportId(windowId: MVDWindowManagement.WindowId): MVDHosting.ViewportId {
    return this.theViewportId;
  }

  private generateWindowProviders(): Map<string, any> {
    const providers: Map<string, any> = new Map();
    providers.set(Angular2InjectionTokens.VIEWPORT_EVENTS, this.generateViewportEventsProvider());

    return providers;
  }

  private generateViewportEventsProvider(): Angular2PluginViewportEvents {
    return {
      resized: this.windowResized
    };
  }

  private onResize() {
    const wh = { width: document.body.clientWidth, height: document.body.clientHeight };
    console.log('onresize', JSON.stringify(wh));
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

