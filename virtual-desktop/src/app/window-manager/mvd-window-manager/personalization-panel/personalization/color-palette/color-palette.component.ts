
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit } from '@angular/core';
import { BaseLogger } from '../../../../../shared/logger';
// import { Angular2InjectionTokens, Angular2PluginWindowActions } from 'pluginlib/inject-resources';
import { ThemeEmitterService } from '../../services/theme-emitter.service';
import { Colors } from '../../shared/colors';
 

@Component({
  selector: 'color-palette',
  templateUrl: './color-palette.component.html',
  styleUrls: ['./color-palette.component.css'],
  providers: [],
})

export class ColorPalette implements OnInit {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  public selectedColor: string | Object;
  private colors: string[][];
  // public selectedSize: string | Object;
  // public files: UploadFile[] = [];

  constructor(
    private desktopThemeService: ThemeEmitterService
  ) {
    this.selectedColor = Colors.COOLGREY_90;
  }

  ngOnInit(): void {
    this.selectedColor = this.desktopThemeService.mainColor;
  }

  colorSelected(color: any): void {
    this.selectedColor = color.hsl;
    let textColor = Colors.COOLGREY_10
    
    if (color.hsl.l >= .65) { // If lightness of color is too high, we change the text to be dark
      textColor = Colors.COOLGREY_90
    }
    this.desktopThemeService.changeColor(color.hex, textColor);
  }

  // colorPreview(color: any): void {
  //   this.selectedColor = color.hsl;
  //   let textColor = Colors.COOLGREY_10
    
  //   if (color.hsl.l >= .65) { // If lightness of color is too high, we change the text to be dark
  //     textColor = Colors.COOLGREY_90
  //   }
  //   this.desktopThemeService.previewColor(color.hex, textColor);
  // }

}
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
