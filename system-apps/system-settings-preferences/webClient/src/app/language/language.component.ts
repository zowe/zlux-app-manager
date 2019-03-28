
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component } from '@angular/core';
import { BaseLogger } from '../../../../../../virtual-desktop/src/app/shared/logger';
import { LanguageLocaleService } from '../../../../../../virtual-desktop/src/app/i18n/language-locale.service';
//import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
//import { LaunchbarWidgetComponent } from '../../../../../../virtual-desktop/src/app/window-manager/mvd-window-manager/launchbar/launchbar-widget/launchbar-widget.component';

@Component({
  selector: 'language-component',
  templateUrl: './language.component.html',
  styleUrls: ['./language.component.css'],
  providers: [],
})

export class LanguageComponent { 
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  public selectedLanguage: string;
  private idLanguage: string;
  public isRestartWindowVisible: boolean;
  public isVeilVisible: boolean;

  constructor(
    private languageLocaleService: LanguageLocaleService,
    //private launchbarWidget: LaunchbarWidgetComponent,
    // @Inject(Angular2InjectionTokens.LAUNCH_METADATA) private launchMetadata: any
  ) {

    this.selectedLanguage = "English";
    this.idLanguage = "en";
    this.isRestartWindowVisible = false;
    this.isVeilVisible = false;
  }

  applyLanguage(): void {
    this.languageLocaleService.setLanguage(this.idLanguage).subscribe(
      arg => { 
        this.logger.debug(`setLanguage, arg=`,arg);
        this.isRestartWindowVisible = true;
        this.isVeilVisible = true;
       },
      err => {
        this.logger.warn("setLanguage error=",err);
      }
    )
  }

  closeRestartWindow(): void {
    this.isRestartWindowVisible = false;
    this.isVeilVisible = false;
  }

  restartZowe(): void {
    window.location.reload();
  }

  selectEnglish(): void {
    this.selectedLanguage = "English";
    this.idLanguage = "en";
  }

  selectFrench(): void {
    this.selectedLanguage = "French";
    this.idLanguage = "fr";
  }

  selectRussian(): void {
    this.selectedLanguage = "Russian";
    this.idLanguage = "ru";
  }

  selectChinese(): void {
    this.selectedLanguage = "Chinese";
    this.idLanguage = "zh";
  }

  selectJapanese(): void {
    this.selectedLanguage = "Japanese";
    this.idLanguage = "ja";
  }

  selectGeneral(): void {
    // this.applyLanguage();
    // console.log("applied!");
  }

}
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
