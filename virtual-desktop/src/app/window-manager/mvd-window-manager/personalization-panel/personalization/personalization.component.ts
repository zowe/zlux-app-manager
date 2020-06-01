
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { BaseLogger } from '../../../../shared/logger';
// import { Angular2InjectionTokens, Angular2PluginWindowActions } from 'pluginlib/inject-resources';
import { ThemeEmitterService } from '../../services/theme-emitter.service';
import { UploadEvent, UploadFile, FileSystemFileEntry } from 'ngx-file-drop';
import { Colors } from '../../shared/colors';
 

@Component({
  selector: 'personalization-component',
  templateUrl: './personalization.component.html',
  styleUrls: ['./personalization.component.css'],
  providers: [],
})

export class PersonalizationComponent implements OnInit {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  public selectedColor: string | Object;
  public selectedSize: string | Object;
  public files: UploadFile[] = [];

  @ViewChild('canvas1') canvas1: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas2') canvas2: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas3') canvas3: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas4') canvas4: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas5') canvas5: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas6') canvas6: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas7') canvas7: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas8') canvas8: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas9') canvas9: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas10') canvas10: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas11') canvas11: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas12') canvas12: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas13') canvas13: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas14') canvas14: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas15') canvas15: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas16') canvas16: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas17') canvas17: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas18') canvas18: ElementRef<HTMLCanvasElement>;

  private paletteColors = ["#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", 
  "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", 
  "#ff9800", "#252628", "#6d7176", "#f3f4f4"];

  constructor(
    private desktopThemeService: ThemeEmitterService
  ) {
    this.selectedColor = Colors.COOLGREY_90;
    this.selectedSize = 2;
  }

  ngOnInit(): void {
    this.selectedColor = this.desktopThemeService.mainColor;
    this.selectedSize = this.desktopThemeService.mainSize;

    // var context = this.canvas.nativeElement.getContext('2d');
    // var centerX = this.canvas.nativeElement.width / 2;
    // var centerY = this.canvas.nativeElement.height / 2;
    // var radius = 20;

    // if (context != null) {
    //   // this.canvas.nativeElement.width = 40;
    //   // this.canvas.nativeElement.height = 40;
    //   context.beginPath();
    //   context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    //   context.fillStyle = '#f44336';
    //   context.fill();
    //   // context.lineWidth = 5;
    //   // context.strokeStyle = '#003300';
    //   context.stroke();
    // }
    this.spawnCircles(this.paletteColors);
  }

  clickCanvas(index: any) {
    this.selectedColor = this.paletteColors[index-1];
    let textColor = Colors.COOLGREY_10
    
    // if (color.hsl.l >= .65) { // If lightness of color is too high, we change the text to be dark
    //   textColor = Colors.COOLGREY_90
    // }
    this.desktopThemeService.changeColor(this.selectedColor, textColor);
  }

  spawnCircles(colors: string[]): void {
    // if (numOfCircles != colors.length) {
    //   this.logger.warn("# of colors specified does not match # of circles to spawn them");
    //   return;
    // }
    
    var index: number;
    var canvasName: string;
    var canvasElem: ElementRef;
    var numOfCircles = colors.length;

    for (index = 1; index <= numOfCircles; index++) {
      canvasName = 'canvas' + index;
      canvasElem = (<any>this)[canvasName]; // We typecast this to 'any' to avoid silly TS compile problems
      
      var context = canvasElem.nativeElement.getContext('2d');
      var centerX = canvasElem.nativeElement.width / 2;
      var centerY = canvasElem.nativeElement.height / 2;
    
      var radius = 20;
      // canvasElem.nativeElement.addEventListener('click', function($event:any) {
      //   console.log("yeet lol", $event)
      //  }, false);

      if (context != null) {
        // this.canvas.nativeElement.width = 40;
        // this.canvas.nativeElement.height = 40;
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        context.fillStyle = colors[index-1];
        context.fill();
        // context.lineWidth = 5;
        // context.strokeStyle = '#003300';
        context.stroke();
      }
    }
  }

  colorSelected(color: any): void {
    this.selectedColor = color.hsl;
    let textColor = Colors.COOLGREY_10
    
    if (color.hsl.l >= .65) { // If lightness of color is too high, we change the text to be dark
      textColor = Colors.COOLGREY_90
    }
    this.desktopThemeService.changeColor(color.hex, textColor);
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

  fileDrop(event: UploadEvent): void {
    this.files = event.files;
    for (const droppedFile of event.files) {

      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
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
  }

  goBack(): void {
    this.desktopThemeService.goBack();
  }

}
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
