

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, EventEmitter } from '@angular/core';
import { Colors } from '../shared/colors';

@Injectable()
export class ThemeEmitterService {
  public onColorChange = new EventEmitter<any>();
  public onColorPreview = new EventEmitter<any>();
  public onSizeChange = new EventEmitter<any>();
  public onWallpaperChange = new EventEmitter<any>();
  public onResetAllDefault = new EventEmitter<any>();
  public onGoBack = new EventEmitter<any>();
  public mainColor: string;
  public mainSize: number;

  constructor() {
    this.mainColor = Colors.COOLGREY_80;
    this.mainSize = 2;
  }

  /* Expected input in 'hex' format */
  changeColor(themeColor: any, textColor: any) {
    let colorObj = {
      themeColor: themeColor || Colors.COOLGREY_80, // Fallback is dark grey
      textColor: textColor || Colors.COOLGREY_20 // Fallback is nearly white
    }
    this.mainColor = colorObj.themeColor;
    this.onColorChange.emit(colorObj);
  }

  /* Expected input in 'hex' format */
  previewColor(themeColor: any, textColor: any) {
    let colorObj = {
      themeColor: themeColor || Colors.COOLGREY_80, // Fallback is dark grey
      textColor: textColor || Colors.COOLGREY_20 // Fallback is nearly white
    }
    this.mainColor = colorObj.themeColor;
    this.onColorPreview.emit(colorObj);
  }

  /* 1 - small, 2 - medium, 3 - large */
  changeSize(windowSize: number, launchbarSize: number, launchbarMenuSize: number) {
    let sizeObj = { // Fallback is medium
      windowSize: windowSize || 2,
      launchbarSize: launchbarSize || 2,
      launchbarMenuSize: launchbarMenuSize || 2
    }
    this.mainSize = sizeObj.windowSize;
    this.onSizeChange.emit(sizeObj);
  }

  changeWallpaper(image: any) { //Fallback is default Zowe blue background
    this.onWallpaperChange.emit(image);
  }

  resetAllDefault(): void {
    this.onResetAllDefault.emit();
  }

  goBack(): void {
    this.onGoBack.emit();
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

