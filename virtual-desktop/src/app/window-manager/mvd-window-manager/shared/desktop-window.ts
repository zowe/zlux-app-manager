

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
  public readonly plugin: ZLUX.Plugin;
  viewportId: MVDHosting.ViewportId;
  closeHandler: (() => Promise<void>) | null;

  constructor(windowId: MVDWindowManagement.WindowId, windowState: DesktopWindowState, plugin: ZLUX.Plugin) {
    this._windowTitle = '';
    this.windowId = windowId;
    this.windowState = windowState;
    this.closeHandler = null;
    this.plugin = plugin;
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
  }

  get windowTitle(): string {
    return this._windowTitle;
  }

  set windowTitle(value: string) {
    this._windowTitle = value;
    this.localWindowEvents.windowTitleChanged.emit(value);
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

