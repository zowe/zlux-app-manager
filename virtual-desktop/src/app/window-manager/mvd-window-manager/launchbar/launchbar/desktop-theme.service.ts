

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, EventEmitter } from '@angular/core';
//import { LaunchbarComponent } from './launchbar.component';

@Injectable({
  providedIn: 'root',
})
export class DesktopThemeService {
  public currentTheme = 'default';
  public keyUpEvent = new EventEmitter<KeyboardEvent>();
  public onColorChanged = new EventEmitter<any>();
  public onSizeChanged = new EventEmitter<any>();
  constructor() {
    console.log("BAR SIZE", this.currentTheme);
    this.keyUpHandler = this.keyUpHandler.bind(this);
  }

  registerKeyUpEvent() {
    document.addEventListener('keyup', this.keyUpHandler, true);
  }

  keyUpHandler(event: KeyboardEvent) {
    if(event.altKey && event.ctrlKey) {
      event.stopImmediatePropagation();
      this.keyUpEvent.emit(event);
    }
  }

  // Expected input in 'hex' format
  changeColor(themeColor: any, textColor: any) {
    let colorObj = {
      themeColor: themeColor || "#3d3f42", // Default is dark grey
      textColor: textColor || "#dddee0" // Default is nearly white
    }
    this.onColorChanged.emit(colorObj);
  }

  changeSize(windowSize: any, launchbarSize: any, launchbarMenuSize: any) {
    let sizeObj = { // Default is medium
      windowSize: windowSize || 2,
      launchbarSize: launchbarSize || 2,
      launchbarMenuSize: launchbarMenuSize || 2
    }
    this.onSizeChanged.emit(sizeObj);
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

