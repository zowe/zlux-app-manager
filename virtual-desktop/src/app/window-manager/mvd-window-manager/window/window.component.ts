

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, Inject, ElementRef, ViewChild, Input } from '@angular/core';
import { DesktopWindow } from '../shared/desktop-window';
import { DesktopWindowStateType } from '../shared/desktop-window-state';
import { WindowManagerService } from '../shared/window-manager.service';
import { WindowPosition } from '../shared/window-position';

const SCREEN_EDGE_BORDER = 2;
const WINDOW_HEADER_HEIGHT = WindowManagerService.WINDOW_HEADER_HEIGHT;

@Component({
  selector: 'rs-com-mvd-window',
  templateUrl: 'window.component.html',
  styleUrls: ['window.component.css']
})
export class WindowComponent {
  @ViewChild('windowBody')
  public windowBodyRef: ElementRef;

  MIN_WIDTH = 180;
  MIN_HEIGHT = 100;

  @Input() desktopWindow: DesktopWindow;

  
  constructor(
    public windowManager: WindowManagerService,
    @Inject(MVDHosting.Tokens.ApplicationManagerToken) public applicationManager: MVDHosting.ApplicationManagerInterface
  ) {

  }

  isMinimized(): boolean {
    return this.desktopWindow.windowState.stateType === DesktopWindowStateType.Minimized;
  }

  isMaximized(): boolean {
    return this.desktopWindow.windowState.stateType === DesktopWindowStateType.Maximized;
  }

  isNormal(): boolean {
    return this.desktopWindow.windowState.stateType === DesktopWindowStateType.Normal;
  }

  hasFocus(): boolean {
    return this.windowManager.windowHasFocus(this.desktopWindow.windowId);
  }

  positionStyle(): any {
    const position = this.getPosition();
    if (position.top < 0) {
      position.top = SCREEN_EDGE_BORDER;
    }
    if (position.left + position.width - WINDOW_HEADER_HEIGHT < 0) {
      position.left = -position.width + WINDOW_HEADER_HEIGHT;
    }
    var positionBottom = document.getElementsByClassName('window-pane').item(0).getBoundingClientRect().bottom;
    var positionRight = document.getElementsByClassName('window-pane').item(0).getBoundingClientRect().right;
    if ((position.top + WINDOW_HEADER_HEIGHT) > positionBottom) {
      position.top = positionBottom - WINDOW_HEADER_HEIGHT;
    }
    if ((position.left + WINDOW_HEADER_HEIGHT) > positionRight) {
      position.left = positionRight - WINDOW_HEADER_HEIGHT;
    }

    return {
      'top': position.top + 'px',
      'left': position.left + 'px',
      'width': position.width + 'px',
      'max-width': 'calc(100%)',
      'height': (position.height + WindowManagerService.WINDOW_HEADER_HEIGHT) + 'px',
      'max-height': 'calc(100%)',
      'z-index': this.desktopWindow.windowState.zIndex,
      'inner-height': position.height + 'px'

    };
  }

  getPosition(): WindowPosition {
    return this.desktopWindow.windowState.position;
  }

  getTitle(): string {
    return this.desktopWindow.windowTitle;
  }

  requestFocus(): void {
    this.windowManager.requestWindowFocus(this.desktopWindow.windowId);
  }

  maximizeToggle(): void {
    this.windowManager.maximizeToggle(this.desktopWindow.windowId);
  }

  minimizeToggle(): void {
    this.windowManager.minimizeToggle(this.desktopWindow.windowId);
  }

  close(): void {
    this.windowManager.closeWindow(this.desktopWindow.windowId);
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

