
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { BaseLogger } from '../../../../shared/logger';
// import { Angular2InjectionTokens, Angular2PluginWindowActions } from 'pluginlib/inject-resources';
import { ThemeEmitterService } from '../../services/theme-emitter.service';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import { Colors } from '../../shared/colors';
import { L10nTranslationService } from 'angular-l10n';
 
const SLIDER_NAME = 'slider'
const CIRCLE_NAME = 'circle'

@Component({
  selector: 'personalization-component',
  templateUrl: './personalization.component.html',
  styleUrls: ['./personalization.component.css'],
  providers: [],
})

export class PersonalizationComponent implements AfterViewInit {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  public selectedColor: string;
  public selectedSize: string | Object;
  public selectedLightness: number;
  public selectedCircle: number;
  public files: NgxFileDropEntry[];

  @ViewChild('circle1') circle1: ElementRef;
  @ViewChild('circle2') circle2: ElementRef;
  @ViewChild('circle3') circle3: ElementRef;
  @ViewChild('circle4') circle4: ElementRef;
  @ViewChild('circle5') circle5: ElementRef;
  @ViewChild('circle6') circle6: ElementRef;
  @ViewChild('circle7') circle7: ElementRef;
  @ViewChild('circle8') circle8: ElementRef;
  @ViewChild('circle9') circle9: ElementRef;
  @ViewChild('circle10') circle10: ElementRef;
  @ViewChild('circle11') circle11: ElementRef;
  @ViewChild('circle12') circle12: ElementRef;
  @ViewChild('circle13') circle13: ElementRef;
  @ViewChild('circle14') circle14: ElementRef;
  @ViewChild('circle15') circle15: ElementRef;
  @ViewChild('circle16') circle16: ElementRef;
  @ViewChild('circle17') circle17: ElementRef;
  @ViewChild('circle18') circle18: ElementRef;

  @ViewChild('slider1') slider1: ElementRef;
  private sliderImgData: any;

  private paletteColors: string[];

  public swatch1Style: any;
  public swatch2Style: any;
  public swatch3Style: any;
  public swatch4Style: any;
  public swatch5Style: any;

  /* I18n strings used in the UI */

  public Back: string;
  public ResetToDefault: string;
  public Background: string;
  public DragWallpaperHereOr: string;
  public Color: string;
  public SelectColor: string;
  public OrHue: string;
  public SelectLightness: string;
  public Size: string;
  public Upload: string;

  constructor(
    private desktopThemeService: ThemeEmitterService,
    private translation: L10nTranslationService
  ) {
    this.selectedColor = Colors.COOLGREY_90;
    this.selectedSize = 2;
    this.paletteColors = ["#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", 
    "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", 
    "#ff9800", "#252628", "#6d7176", "#f3f4f4"];
    this.files = [];
    this.swatch1Style; this.swatch2Style; this.swatch3Style; this.swatch4Style; this.swatch5Style; // Avoid TS compile problems
    this.updateLanguageStrings();
  }

  ngAfterViewInit(): void {
    this.selectedColor = this.desktopThemeService.mainColor;
    this.selectedSize = this.desktopThemeService.mainSize;
  
    this.spawnCircles(this.paletteColors);
    this.spawnSlider();
    
    let selectedColorHSL = this.hexToHSL(this.selectedColor);
    if (selectedColorHSL != null) {
      this.updateLightnessSwatches(selectedColorHSL);
    }
    this.whichColorAmI();
  }

  /* More info on conversion chart can be found at: https://css-tricks.com/converting-color-spaces-in-javascript/ */
  hexToHSL(hex: string) {
    // Convert hex to RGB first
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    if (result != null && result[1] != null && result[2] != null && result[3] != null)
    {
      var r = parseInt(result[1], 16);
      var g = parseInt(result[2], 16);
      var b = parseInt(result[3], 16);
      // Then to HSL
      r /= 255;
      g /= 255;
      b /= 255;
      let cmin = Math.min(r,g,b),
          cmax = Math.max(r,g,b),
          delta = cmax - cmin,
          h = 0,
          s = 0,
          l = 0;
    
      if (delta == 0)
        h = 0;
      else if (cmax == r)
        h = ((g - b) / delta) % 6;
      else if (cmax == g)
        h = (b - r) / delta + 2;
      else
        h = (r - g) / delta + 4;
    
      h = Math.round(h * 60);
    
      if (h < 0)
        h += 360;
    
      l = (cmax + cmin) / 2;
      s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

      return [h, s, l]
    }
    return null;
  }

  hSLtoHex(hsl: number[]) {
    let h = hsl[0];
    let s = hsl[1];
    let l = hsl[2];

    let c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs((h / 60) % 2 - 1)),
    m = l - c/2,
    r = 0,
    g = 0,
    b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }

    // Having obtained RGB, convert channels to hex
    let rString = Math.round((r + m) * 255).toString(16);
    let gString = Math.round((g + m) * 255).toString(16);
    let bString = Math.round((b + m) * 255).toString(16);

    // Prepend 0s, if necessary
    if (rString.length == 1)
      rString = "0" + rString;
    if (gString.length == 1)
      gString = "0" + gString;
    if (bString.length == 1)
      bString = "0" + bString;

    return "#" + rString + gString + bString;
  }

  rGBtoHex(r: number, g: number, b: number) {
    let rString = r.toString(16);
    let gString = g.toString(16);
    let bString = b.toString(16);
  
    if (rString.length == 1)
      rString = "0" + rString;
    if (gString.length == 1)
      gString = "0" + gString;
    if (bString.length == 1)
      bString = "0" + bString;
  
    return "#" + rString + gString + bString;
  }

  clickCircle(index: any) {
    this.selectedColor = this.paletteColors[index-1];
    let textColor = Colors.COOLGREY_10
    const hslColor = this.hexToHSL(this.selectedColor);

    if (hslColor != null) {
      if (hslColor[2] >= .65) { // If lightness of color is too high, we change the text to be dark
        textColor = Colors.COOLGREY_90
      }
      this.updateLightnessSwatches(hslColor);
    }

    this.selectedCircle = index;
    this.selectedLightness = -1;
    this.desktopThemeService.changeColor(this.selectedColor, textColor);
  }

  clickLightness(lightness: number): void {
    const selectedColorHSL = this.hexToHSL(this.selectedColor);
    let newHSL: number[];
    let newColor: string;
    if (selectedColorHSL != null) {
      newHSL = [selectedColorHSL[0], selectedColorHSL[1], lightness];
      newColor = this.hSLtoHex(newHSL);
      let textColor = Colors.COOLGREY_10

      if (newHSL != null) {
        if (newHSL[2] >= .65) { // If lightness of color is too high, we change the text to be dark
          textColor = Colors.COOLGREY_90
        }
      }
      this.selectedLightness = lightness;
      this.desktopThemeService.changeColor(newColor, textColor);
    }
  }

  clickSlider($event: any) {
    this.sliderImgData;
    let index = ($event.layerY * this.sliderImgData.width + $event.layerX) * 4;
    let red = this.sliderImgData.data[index];
    let green = this.sliderImgData.data[index+1];
    let blue = this.sliderImgData.data[index+2];
    let hexColor = this.rGBtoHex(red, green, blue);

    // TODO: Adjust lightness of text color based on color theory/contrast/relative luminance
    let textColor = Colors.COOLGREY_10;

    this.selectedCircle = -1;
    this.selectedLightness = -1;
    let hslColor = this.hexToHSL(hexColor);
    if (hslColor != null) {
      this.updateLightnessSwatches(hslColor);
    }
    this.selectedColor = hexColor;
    this.desktopThemeService.changeColor(hexColor, textColor);
  }

  spawnCircles(colors: string[]): void {    
    var index: number;
    var canvasName: string;
    var canvasElem: ElementRef;
    var numOfCircles = colors.length;

    for (index = 1; index <= numOfCircles; index++) {
      canvasName = CIRCLE_NAME + index;
      canvasElem = (<any>this)[canvasName]; // We typecast this to 'any' to avoid silly TS compile problems
      
      var context = canvasElem.nativeElement.getContext('2d');
      var centerX = canvasElem.nativeElement.width / 2;
      var centerY = canvasElem.nativeElement.height / 2;
    
      var radius = 20;

      if (context != null) {
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        context.fillStyle = colors[index-1];
        context.fill();
        context.stroke();
      }
    }
  }

  spawnSlider(): void {
    var canvasName: string = SLIDER_NAME + '1';
    var canvasElem: ElementRef = (<any>this)[canvasName]; // We typecast this to 'any' to avoid silly TS compile problems

    // Create gradient
    var ctx = canvasElem.nativeElement.getContext("2d");         
    var gradient = ctx.createLinearGradient(14, 0, 389, 0);
    gradient.addColorStop(0, 'red');
    gradient.addColorStop(1 / 6, 'orange');
    gradient.addColorStop(2 / 6, 'yellow');
    gradient.addColorStop(3 / 6, 'green');
    gradient.addColorStop(4 / 6, 'blue');
    gradient.addColorStop(5 / 6, 'indigo');
    gradient.addColorStop(1, 'violet');

    // Fill
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 389, 14);

    // Save imgData
    this.sliderImgData = ctx.getImageData(0, 0, canvasElem.nativeElement.width, canvasElem.nativeElement.height);
  }

  updateLanguageStrings(): void {
    this.Back = this.translation.translate('Back', null);
    this.ResetToDefault = this.translation.translate('Reset to default', null);
    this.Background = this.translation.translate('Wallpaper', null);
    this.DragWallpaperHereOr = this.translation.translate('Drag wallpaper here or', null); // TODO: Needs updated translations
    this.Color = this.translation.translate('Color', null);
    this.SelectColor = this.translation.translate('Select color', null);
    this.OrHue = this.translation.translate('or hue.', null);
    this.SelectLightness = this.translation.translate('Select lightness.', null);
    this.Size = this.translation.translate('Size', null);
    this.Upload = this.translation.translate('Upload', null);
  }

  updateLightnessSwatches(hslColor: number[]): void {
    this.swatch1Style = { 'background-color': 'hsl(' + hslColor[0] + ',' + hslColor[1]*100 + '%,' + 80 + '%)'};
    this.swatch2Style = { 'background-color': 'hsl(' + hslColor[0] + ',' + hslColor[1]*100 + '%,' + 65 + '%)'};
    this.swatch3Style = { 'background-color': 'hsl(' + hslColor[0] + ',' + hslColor[1]*100 + '%,' + 50 + '%)'};
    this.swatch4Style = { 'background-color': 'hsl(' + hslColor[0] + ',' + hslColor[1]*100 + '%,' + 35 + '%)'};
    this.swatch5Style = { 'background-color': 'hsl(' + hslColor[0] + ',' + hslColor[1]*100 + '%,' + 20 + '%)'};
  }

  colorPreview(color: any): void {
    this.selectedColor = color.hsl;
    let textColor = Colors.COOLGREY_10
    
    if (color.hsl.l >= .65) { // If lightness of color is too high, we change the text to be dark
      textColor = Colors.COOLGREY_90
    }
    this.desktopThemeService.previewColor(color.hex, textColor);
  }

  sizeSelected(size: string): void {
    switch(size) {
      case "small": {
        this.desktopThemeService.changeSize(1, 1, 1);
        this.selectedSize = 1;
        break;
      }
      case "large": {
        this.desktopThemeService.changeSize(3, 3, 3);
        this.selectedSize = 3;
        break;
      }
      default: {
        this.desktopThemeService.changeSize(2, 2, 2);
        this.selectedSize = 2;
        break;
      }
    }
  }

  fileDrop(files: any): void {
    this.files = files;
    for (const droppedFile of files) {

      // Is it a file?
      if (droppedFile.fileEntry.isFile) { // TODO: Verify file extensions here
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {

          // Here you can access the real file
          this.logger.debug(droppedFile.relativePath, file);
          this.desktopThemeService.changeWallpaper(file);
        });
      } else { // It was a directory
        // TODO: Folders are disabled by default, so not sure how this would trigger, but maybe notification for fail?
        return
      }
    }
  }

  resetAllDefault(): void {
    this.files = [];
    this.desktopThemeService.resetAllDefault();
    this.selectedColor = Colors.COOLGREY_90;
    this.selectedSize = 2;
    this.selectedCircle = 16;
  }

  goBack(): void {
    this.desktopThemeService.goBack();
  }

  whichColorAmI(): void {
    var index: number;
    for (index = 0; index <= this.paletteColors.length; index++) {
      if (this.selectedColor == this.paletteColors[index]) {
        this.selectedCircle = index+1;
      }
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
