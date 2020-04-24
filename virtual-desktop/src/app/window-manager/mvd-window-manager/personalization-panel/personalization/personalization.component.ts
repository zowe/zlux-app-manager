
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component } from '@angular/core';
import { BaseLogger } from '../../../../shared/logger';
// import { Angular2InjectionTokens, Angular2PluginWindowActions } from 'pluginlib/inject-resources';
import { TranslationService } from 'angular-l10n';
import { DesktopThemeService } from '../../launchbar/launchbar/desktop-theme.service';
import { NgxFileDropEntry, FileSystemFileEntry, FileSystemDirectoryEntry } from 'ngx-file-drop';
 

@Component({
  selector: 'personalization-component',
  templateUrl: './personalization.component.html',
  styleUrls: ['./personalization.component.css'],
  providers: [],
})

export class PersonalizationComponent {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  public selectedColor: string | Object;
  public files: NgxFileDropEntry[] = [];

  constructor(
    private translation: TranslationService,
    private desktopThemeService: DesktopThemeService,

  ) {
    this.selectedColor = "#252628";
  }

  colorSelected(color: any): void { //$event = color
    this.selectedColor = color.hex;
    let textColor = "#f3f4f4"

    // console.log("lightness: ", color.hsl.l)

    // switch(true) { // The lightness of the color
    //   case color.hsl.l <= 0.2: {
    //     color.hsl.l = 0.2;
    //     break;
    //   }
    //   case color.hsl.l <= 0.35: {
    //     color.hsl.l = 0.35;
    //     break;
    //   }
    //   case color.hsl.l <= 0.5: {
    //     color.hsl.l = 0.5;
    //     break;
    //   }
    //   case color.hsl.l <= 0.65: {
    //     color.hsl.l = 0.65;
    //     break;
    //   }
    //   default: {
    //     color.hsl.l = 0.8;
    //     break;
    //   }
    // }
    
    //this.selectedColor = {h: color.hsl.h, s: color.hsl.s, l: color.hsl.l}

    //console.log("lightness: ", color.hsl.l)
    if (color.hsl.l >= .65) { // If lightness of color is too high, we change the text to be dark
      textColor = "#252628"
    }
    this.desktopThemeService.changeColor(this.selectedColor, textColor);
    this.logger.debug(this.translation.translate('Theme changed to: ', this.selectedColor, textColor));
  }

  previewSelected(size: string): void {
    switch(size) {
      case "small": {
        this.desktopThemeService.changeSize(1, 1, 1);
        break;
      }
      case "large": {
        this.desktopThemeService.changeSize(3, 3, 3);
        break;
      }
      default: {
        this.desktopThemeService.changeSize(2, 2, 2);
        break;
      }
    }
  }

  dropped(files: NgxFileDropEntry[]): void {
    this.files = files;
    for (const droppedFile of files) {

      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {

          // Here you can access the real file
          console.log("Files: ", this.files);
          console.log(droppedFile.relativePath, file);
          this.desktopThemeService.changeWallpaper(file);


        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        console.log(droppedFile.relativePath, fileEntry);
      }
    }
  }

  resetAllDefault(): void {
    this.files = [];
    this.desktopThemeService.resetAllDefault();
  }

}
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
