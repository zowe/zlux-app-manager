

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
import { BaseLogger } from '../../../shared/logger';
import { Colors } from '../shared/colors';

const SCREEN_EDGE_BORDER = 2;

@Component({
  selector: 'rs-com-mvd-window',
  templateUrl: 'window.component.html',
  styleUrls: ['window.component.css']
})
export class WindowComponent {
  @ViewChild('windowBody')
  public windowBodyRef: ElementRef;

  public color: any = {};
  public headerSize: number;
  public borderSize: string;
  public textSize: string;
  public textPad: string;
  public buttonTop: string;
  public buttonSize: string;
  public buttonFilter: string;
  public minimizeLeft: string;
  public maximizeLeft: string;
  public closeLeft: string;
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  public displayMinimize: boolean;

  private maxHeight: string;
  private maxWidth: string;
  private desktopHeight: number;
  private desktopWidth: number;
  private zIndex: number;
  private launchbarHeight: number;
  
  @Input() set theme(newTheme: DesktopTheme) {
    this.logger.debug('Window theme set=',newTheme);
    this.color = newTheme.color;
    //button left strategy: size*.6 or .66 between each element and sides
    //therefore (buttonNumber*size*.6)+((buttonNumber-1)*size)
    switch (newTheme.size.window) {
      case 1:
        this.borderSize = '1px';
        this.buttonSize = '10px';
        this.closeLeft = '6px';
        this.minimizeLeft = '22px';
        this.maximizeLeft = '39px';
        this.buttonTop = '6px';
        this.textSize = '12px';
        this.textPad = '3px';
        this.displayMinimize = true;

        // TODO: Disable minimize button once mvd-window-manager single app mode is functional. Variable subject to change.
        if (window['GIZA_PLUGIN_TO_BE_LOADED']) {
          this.displayMinimize = false;
          this.maximizeLeft = this.minimizeLeft;
        }
        break;
      case 3:
        this.borderSize = '3px';
        this.buttonSize = '16px';
        this.closeLeft = '11px';
        this.minimizeLeft = '38px';
        this.maximizeLeft = '66px';
        this.buttonTop = '16px';
        this.textSize = '18px';
        this.textPad = '12px';
        this.displayMinimize = true;

        // TODO: Disable minimize button once mvd-window-manager single app mode is functional. Variable subject to change.
        if (window['GIZA_PLUGIN_TO_BE_LOADED']) {
          this.displayMinimize = false;
          this.maximizeLeft = this.minimizeLeft;
        }
        break;
      default: //Default size is medium - 2
        this.borderSize = '2px';
        this.buttonSize = '12px';
        this.closeLeft = '8px';
        this.minimizeLeft = '28px';
        this.maximizeLeft = '49px';
        this.buttonTop = '9px';
        this.textSize = '14px';
        this.textPad = '5px';
        this.displayMinimize = true;

        // TODO: Disable minimize button once mvd-window-manager single app mode is functional. Variable subject to change.
        if (window['GIZA_PLUGIN_TO_BE_LOADED']) {
          this.displayMinimize = false;
          this.maximizeLeft = this.minimizeLeft;
        }
    }
    switch (newTheme.color.windowTextActive) {
      case Colors.COOLGREY_90:
        this.buttonFilter = 'brightness(0.2)';
        break;
      default:
        this.buttonFilter = 'brightness(1)';
        break;
    }
    (WindowManagerService as any)._setTheme(newTheme);
    this.headerSize = WindowManagerService.WINDOW_HEADER_HEIGHT;
  };
  
  MIN_WIDTH = 180;
  MIN_HEIGHT = 100;

  @Input() desktopWindow: DesktopWindow;
  applicationManager: MVDHosting.ApplicationManagerInterface;


  constructor(
    public windowManager: WindowManagerService,
    private injector: Injector,
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
    if (document.documentElement) {
      this.desktopHeight = document.documentElement.clientHeight;
      this.desktopWidth = document.documentElement.clientWidth;
    }
    this.maxHeight = '100%';
    this.maxWidth = '100%';
    this.zIndex = this.desktopWindow.windowState.zIndex;
    // In standalone app mode, our launchbar doesn't exist
    this.launchbarHeight = (window.GIZA_PLUGIN_TO_BE_LOADED ? 0 : WindowManagerService.LAUNCHBAR_HEIGHT);

    /* These 4 conditionals check if a window is out of bounds by checking if a window has been
    dragged too far out of view, in either of the 4 directions, and locks it from going further. */
    if (!this.desktopWindow.isFullscreenStandalone) {
      if (position.top < 0) {
        position.top = SCREEN_EDGE_BORDER;
      }
      if (position.left + position.width - this.headerSize < 0) {
        position.left = -position.width + this.headerSize;
      }
      if ((position.top + this.headerSize) > this.desktopHeight - this.launchbarHeight) {
        position.top = this.desktopHeight - this.headerSize - this.launchbarHeight;
      }
      if ((position.left + this.headerSize) > this.desktopWidth) {
        position.left = this.desktopWidth - this.headerSize;
      }
    } else {
      this.maxHeight = '110%';
      this.maxWidth = '102%';
      position.left = -1 - SCREEN_EDGE_BORDER;
      position.top = -1 - this.headerSize - SCREEN_EDGE_BORDER;
      position.width = this.desktopWidth + SCREEN_EDGE_BORDER;
      position.height = this.desktopHeight + SCREEN_EDGE_BORDER;
      this.zIndex = 1; // So any app2app apps don't get hidden if we click back to the main fullscreen app
    }

    return {
      'top': position.top + 'px',
      'left': position.left + 'px',
      'width': position.width + 'px',
      'max-width': this.maxWidth,
      'height': (position.height + this.headerSize) + 'px',
      'max-height': this.maxHeight,
      'z-index': this.zIndex,
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

