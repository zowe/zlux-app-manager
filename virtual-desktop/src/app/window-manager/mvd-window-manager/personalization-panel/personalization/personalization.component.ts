
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit } from '@angular/core';
import { BaseLogger } from '../../../../shared/logger';
// import { Angular2InjectionTokens, Angular2PluginWindowActions } from 'pluginlib/inject-resources';
import { TranslationService } from 'angular-l10n';
import { ThemeEmitterService } from '../../services/theme-emitter.service';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
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
  public files: NgxFileDropEntry[] = [];

  constructor(
    private translation: TranslationService,
    private desktopThemeService: ThemeEmitterService,

  ) {
    this.selectedColor = Colors.COOLGREY_90;
    this.selectedSize = 2;
  }

  ngOnInit(): void {
    this.selectedColor = this.desktopThemeService.mainColor;
    this.selectedSize = this.desktopThemeService.mainSize;
  }

  colorSelected(color: any): void {
    this.selectedColor = color.hsl;
    let textColor = Colors.COOLGREY_10
    
    if (color.hsl.l >= .65) { // If lightness of color is too high, we change the text to be dark
      textColor = Colors.COOLGREY_90
    }
    this.desktopThemeService.changeColor(color.hex, textColor);
    this.logger.debug(this.translation.translate('Theme changed to: ', color.hex, textColor));
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

  fileDrop(files: NgxFileDropEntry[]): void {
    this.files = files;
    for (const droppedFile of files) {

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
