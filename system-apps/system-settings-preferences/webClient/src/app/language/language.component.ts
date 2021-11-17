
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, Inject, Optional } from '@angular/core';
import { BaseLogger } from '../../../../../../virtual-desktop/src/app/shared/logger';
import { LanguageLocaleService } from '../../../../../../virtual-desktop/src/app/i18n/language-locale.service';
import { Angular2InjectionTokens, Angular2PluginWindowActions } from 'pluginlib/inject-resources';
import { L10nTranslationService } from 'angular-l10n';

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

  // Strings used in UI
  public Languages: string;
  public RestartDescr1: string;
  public RestartDescr2: string;
  public Apply: string;
  public LanguageSelected: string;
  public RestartNow: string;
  public RestartLater: string;
  public LanguageChanges: string;
  public Select: string;

  constructor(
    private languageLocaleService: LanguageLocaleService,
    private translation: L10nTranslationService,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_ACTIONS) private windowActions: Angular2PluginWindowActions,

  ) {
    this.isRestartWindowVisible = false;
    this.isVeilVisible = false;
    this.updateLanguageSelection();
    this.updateLanguageStrings();
    if (this.windowActions) {this.windowActions.setTitle(this.Languages);}
  }

  applyLanguage(): void {
    this.languageLocaleService.setLanguage(this.idLanguage).subscribe(
      arg => { 
        this.logger.debug("ZWED5323I",arg); //this.logger.debug(`setLanguage, arg=`,arg);
        this.isRestartWindowVisible = true;
        this.isVeilVisible = true;
       },
      err => {
        this.logger.warn("ZWED5192W",err); //this.logger.warn("setLanguage error=",err);
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

  //TODO: Ideally, when selecting a language in the panel we would adjust the language strings to the chosen
  //language in real-time (contrary to restarting the desktop) but this doesn't work yet as this.translation
  //only loads translations for the currently loaded language (that of which data is coming from a cookie)

  selectEnglish(): void {
    this.selectedLanguage = "English";
    this.selectedLanguage = this.translation.translate(this.selectedLanguage);
    this.idLanguage = "en";
  }

  selectFrench(): void {
    this.selectedLanguage = "French";
    this.selectedLanguage = this.translation.translate(this.selectedLanguage);
    this.idLanguage = "fr";
  }

  selectRussian(): void {
    this.selectedLanguage = "Russian";
    this.selectedLanguage = this.translation.translate(this.selectedLanguage);
    this.idLanguage = "ru";
  }

  selectChinese(): void {
    this.selectedLanguage = "Chinese";
    this.selectedLanguage = this.translation.translate(this.selectedLanguage);
    this.idLanguage = "zh";
  }

  selectJapanese(): void {
    this.selectedLanguage = "Japanese";
    this.selectedLanguage = this.translation.translate(this.selectedLanguage);
    this.idLanguage = "ja";
  }

  selectGerman(): void {
    this.selectedLanguage = "German";
    this.selectedLanguage = this.translation.translate(this.selectedLanguage);
    this.idLanguage = "de";
  }

  updateLanguageSelection(): void {
    this.idLanguage = this.languageLocaleService.getLanguage();

    switch(this.idLanguage) {
      case "en": {
        this.selectEnglish();
        break;
      }
      case "fr": {
        this.selectFrench();
        break;
      }
      case "ja": {
        this.selectJapanese();
        break;
      }
      case "ru": {
        this.selectRussian();
        break;
      }
      case "zh": {
        this.selectChinese();
        break;
      }
      case "de": {
        this.selectGerman();
        break;
      }
      default: {
        this.selectEnglish();
        break;
      }
    }
  }

  updateLanguageStrings(): void {
    this.selectedLanguage = this.translation.translate(this.selectedLanguage, null, this.idLanguage+"-");
    this.Languages = this.translation.translate('Languages', null, this.idLanguage+"-");
    this.Apply = this.translation.translate('Apply', null, this.idLanguage+"-");
    this.LanguageChanges = this.translation.translate('Language Changes', null, this.idLanguage+"-");
    this.LanguageSelected = this.translation.translate('Language Selected', null, this.idLanguage+"-");
    this.RestartDescr1 = this.translation.translate('For language changes to take effect, Zowe must be restarted.', null, this.idLanguage+"-");
    this.RestartDescr2 = this.translation.translate('Would you like to restart the desktop?', null, this.idLanguage+"-");
    this.RestartLater = this.translation.translate('Restart Later', null, this.idLanguage+"-");
    this.RestartNow = this.translation.translate('Restart Now', null, this.idLanguage+"-");
    this.Select = this.translation.translate('Select', null, this.idLanguage+"-");

  }

}
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
