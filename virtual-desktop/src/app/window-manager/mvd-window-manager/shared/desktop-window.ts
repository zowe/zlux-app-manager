

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { EventEmitter } from '@angular/core';

import { DesktopWindowState, DesktopWindowStateType } from './desktop-window-state';
import { WindowPosition } from '../shared/window-position';

export interface LocalWindowEvents {
  readonly windowMaximized: EventEmitter<void>;
  readonly windowMinimized: EventEmitter<void>;
  readonly windowRestored: EventEmitter<void>;
  readonly windowMoved: EventEmitter<{top: number, left: number}>;
  readonly windowResized: EventEmitter<{width: number, height: number}>;
  readonly windowTitleChanged: EventEmitter<string>;
}

export class DesktopWindow {
  private _windowTitle: string;
  readonly windowId: MVDWindowManagement.WindowId;
  readonly windowState: DesktopWindowState;
  readonly localWindowEvents: LocalWindowEvents;
  private childViewports: Array<MVDHosting.ViewportId>;
  public readonly plugin: ZLUX.Plugin;
  viewportId: MVDHosting.ViewportId; //primary, if children exist
  public isFullscreenStandalone: boolean;

  closeHandler: (() => Promise<void>) | null; //DEPRECATED 1.0.1, use viewport close handler instead of window
  
  constructor(windowId: MVDWindowManagement.WindowId, windowState: DesktopWindowState, plugin: ZLUX.Plugin) {
    this._windowTitle = '';
    this.windowId = windowId;
    this.windowState = windowState;
    this.closeHandler = null;
    this.plugin = plugin;
    this.childViewports = new Array<MVDHosting.ViewportId>();
    this.localWindowEvents = {
      windowMaximized: new EventEmitter<void>(true),
      windowMinimized: new EventEmitter<void>(true),
      windowRestored: new EventEmitter<void>(true),
      windowMoved: new EventEmitter<{top: number, left: number}>(true),
      windowResized: new EventEmitter<{width: number, height: number}>(true),
      windowTitleChanged: new EventEmitter<string>(true)
    };

    this.windowState.stateChanged.subscribe((state: DesktopWindowStateType) => {
      switch (state) {
        case DesktopWindowStateType.Maximized:
          this.localWindowEvents.windowMaximized.emit();
          break;
        case DesktopWindowStateType.Minimized:
          this.localWindowEvents.windowMinimized.emit();
          break;
        case DesktopWindowStateType.Normal:
          this.localWindowEvents.windowRestored.emit();
          break;
      }
    });

    let lastPosition: WindowPosition | null = null;
    this.windowState.positionChanged.subscribe((state: WindowPosition) => {
      if (lastPosition == null) {
        this.localWindowEvents.windowMoved.emit({ top: state.top, left: state.left });
        this.localWindowEvents.windowResized.emit({ width: state.width, height: state.height });
      } else {
        if (state.top !== lastPosition.top || state.left !== lastPosition.left) {
          this.localWindowEvents.windowMoved.emit({ top: state.top, left: state.left });
        }
        if (state.width !== lastPosition.width || state.height !== lastPosition.height) {
          this.localWindowEvents.windowResized.emit({ width: state.width, height: state.height });
        }
      }

      lastPosition = state;
    });
    this.isFullscreenStandalone = false;
  }

  get windowTitle(): string {
    return this._windowTitle;
  }

  set windowTitle(value: string) {
    this._windowTitle = value;
    this.localWindowEvents.windowTitleChanged.emit(value);
  }

  addChildViewport(viewportId: MVDHosting.ViewportId): void{
    this.childViewports.push(viewportId);
  }

  closeViewports(viewportManager: MVDHosting.ViewportManagerInterface): Promise<any> {
    return new Promise((resolve, reject)=> {
      viewportManager.destroyViewport(this.viewportId).then(()=> {
        if (this.childViewports.length == 0) {
          resolve(null);
        } else {
          this.closeViewportLoop(0, viewportManager, ()=> {
            resolve(null);
          }, (reason:any)=> {
            reject({viewport:this.viewportId, reason:reason});    
          });
        }
      }).catch((reason:any)=> {
        reject({viewport:this.viewportId, reason:reason});
      });
    });
  }

  private closeViewportLoop(pos: number, viewportManager: MVDHosting.ViewportManagerInterface, finishedCallback: any, rejectedCallback: any): void {
    if (pos >= this.childViewports.length) {
      finishedCallback();
    }
    else {
      viewportManager.destroyViewport(this.childViewports[pos]).then(()=> {
        this.closeViewportLoop(++pos,viewportManager,finishedCallback,rejectedCallback);
      }).catch((reason:any)=> {
        rejectedCallback(reason);
      });
    }
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

