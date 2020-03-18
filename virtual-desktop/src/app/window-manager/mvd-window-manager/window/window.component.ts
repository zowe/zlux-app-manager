

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Injector, ElementRef, ViewChild, Input } from '@angular/core';
import { DesktopWindow } from '../shared/desktop-window';
import { DesktopTheme } from "../desktop/desktop.component";
import { DesktopWindowStateType } from '../shared/desktop-window-state';
import { WindowManagerService } from '../shared/window-manager.service';
import { WindowPosition } from '../shared/window-position';

const SCREEN_EDGE_BORDER = 2;
const LAUNCHBAR_HEIGHT = WindowManagerService.LAUNCHBAR_HEIGHT;

@Component({
  selector: 'rs-com-mvd-window',
  templateUrl: 'window.component.html',
  styleUrls: ['window.component.css']
})
export class WindowComponent {
  @ViewChild('windowBody')
  public windowBodyRef: ElementRef;

  public color:any = {};
  public headerSize:number;
  public borderSize:string;
  public textSize:string;
  public buttonTop:string;
  
  @Input() set theme(newTheme: DesktopTheme) {
    console.log('Window theme set=',newTheme);
    this.color = newTheme.color;
    switch (newTheme.size.window) {
    case 1:
      this.headerSize = 20;
      this.borderSize = '1px';
      this.buttonTop = '0px';
      this.textSize = '12px';
      break;
    case 3:
      this.headerSize = 48;
      this.borderSize = '3px';
      this.buttonTop = '12px';
      this.textSize = '18px';
      break;
    default:
      //2
      this.headerSize = 30;
      this.borderSize = '2px';
      this.buttonTop = '5px';
      this.textSize = '14px';
    }
  };
  
  MIN_WIDTH = 180;
  MIN_HEIGHT = 100;

  @Input() desktopWindow: DesktopWindow;
  applicationManager: MVDHosting.ApplicationManagerInterface;


  constructor(
    public windowManager: WindowManagerService,
    private injector: Injector
  ) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
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
    const DESKTOP_HEIGHT = document.getElementsByClassName('window-pane')[0].clientHeight;
    const DESKTOP_WIDTH = document.getElementsByClassName('window-pane')[0].clientWidth;

    /* These 4 conditionals check if a window is out of bounds by checking if a window has been
    dragged too far out of view, in either of the 4 directions, and locks it from going further. */
    if (position.top < 0) {
      position.top = SCREEN_EDGE_BORDER;
    }
    if (position.left + position.width - this.headerSize < 0) {
      position.left = -position.width + this.headerSize;
    }
    if ((position.top + this.headerSize) > DESKTOP_HEIGHT - LAUNCHBAR_HEIGHT) {
      position.top = DESKTOP_HEIGHT - this.headerSize - LAUNCHBAR_HEIGHT;
    }
    if ((position.left + this.headerSize) > DESKTOP_WIDTH) {
      position.left = DESKTOP_WIDTH - this.headerSize;
    }

    return {
      'top': position.top + 'px',
      'left': position.left + 'px',
      'width': position.width + 'px',
      'max-width': 'calc(100%)',
      'height': (position.height + this.headerSize) + 'px',
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

