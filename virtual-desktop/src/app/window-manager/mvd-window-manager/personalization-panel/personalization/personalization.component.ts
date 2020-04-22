
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, Inject, Optional } from '@angular/core';
import { BaseLogger } from '../../../../shared/logger';
import { Angular2InjectionTokens, Angular2PluginWindowActions } from 'pluginlib/inject-resources';
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
  private selectedColor: string;
  private idLanguage: string;
  public isRestartWindowVisible: boolean;
  public isVeilVisible: boolean;

  // Strings used in UI
  public Personalization: string;
  public RestartDescr1: string;
  public RestartDescr2: string;
  public Apply: string;
  public LanguageSelected: string;
  public RestartNow: string;
  public RestartLater: string;
  public LanguageChanges: string;
  public Select: string;

  public files: NgxFileDropEntry[] = [];

  constructor(
    private translation: TranslationService,
    private desktopThemeService: DesktopThemeService,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_ACTIONS) private windowActions: Angular2PluginWindowActions,

  ) {
    this.updateLanguageStrings();
    this.selectedColor = "#252628";
    if (this.windowActions) {this.windowActions.setTitle(this.Personalization);}
  }

  updateLanguageStrings(): void {
    this.Personalization = this.translation.translate('Personalization', null, this.idLanguage+"-");
    this.Apply = this.translation.translate('Apply', null, this.idLanguage+"-");
    this.LanguageChanges = this.translation.translate('Language Changes', null, this.idLanguage+"-");
    this.LanguageSelected = this.translation.translate('Language Selected', null, this.idLanguage+"-");
    this.RestartDescr1 = this.translation.translate('For language changes to take effect, Zowe must be restarted.', null, this.idLanguage+"-");
    this.RestartDescr2 = this.translation.translate('Would you like to restart the desktop?', null, this.idLanguage+"-");
    this.RestartLater = this.translation.translate('Restart Later', null, this.idLanguage+"-");
    this.RestartNow = this.translation.translate('Restart Now', null, this.idLanguage+"-");
    this.Select = this.translation.translate('Select', null, this.idLanguage+"-");

  }

  colorSelected(color: any): void { //$event = color
    this.selectedColor = color.hex;
    let textColor = "#f3f4f4"
    console.log(this.selectedColor); //$event.hex
    if (color.hsl.l >= .65) {
      textColor = "#252628"
    }
    this.desktopThemeService.changeColor(this.selectedColor, textColor);
    this.logger.info(this.translation.translate('Theme changed!'));
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

  dropped(files: NgxFileDropEntry[]) {
    this.files = files;
    for (const droppedFile of files) {

      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {

          // Here you can access the real file
          console.log(droppedFile.relativePath, file);

          /**
          // You could upload it like this:
          const formData = new FormData()
          formData.append('logo', file, relativePath)

          // Headers
          const headers = new HttpHeaders({
            'security-token': 'mytoken'
          })

          this.http.post('https://mybackend.com/api/upload/sanitize-and-save-logo', formData, { headers: headers, responseType: 'blob' })
          .subscribe(data => {
            // Sanitized logo returned from backend
          })
          **/

        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        console.log(droppedFile.relativePath, fileEntry);
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
