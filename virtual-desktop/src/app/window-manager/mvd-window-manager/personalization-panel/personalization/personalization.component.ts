
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
// import { LaunchbarComponent } from '../../launchbar/launchbar/launchbar.component'
// import { DesktopThemeService } from '../../shared/desktop-theme.service';

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

  constructor(
    private translation: TranslationService,
    private desktopThemeService: DesktopThemeService,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_ACTIONS) private windowActions: Angular2PluginWindowActions,

  ) {
    this.isRestartWindowVisible = false;
    this.isVeilVisible = false;
    this.updateLanguageStrings();
    this.selectedColor = "#252628";
    console.log("THEME SERVICE 2", this.desktopThemeService);
    if (this.windowActions) {this.windowActions.setTitle(this.Personalization);}
  }

  closeRestartWindow(): void {
    this.isRestartWindowVisible = false;
    this.isVeilVisible = false;
  }

  restartZowe(): void {
    window.location.reload();
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

    // this.launchbarComponent.size = 4;
    //         this.launchbarComponent._theme.size.window = 2;
    //         this.launchbarComponent._theme.size.launchbar = 2;
    //         this.launchbarComponent._theme.size.launchbarMenu = 2;
    //         const newColor = color.hex;
    //         const text = "#dddee0";
    //         this.launchbarComponent._theme.color.windowColorActive = "#3d3f42";
    //         this.launchbarComponent._theme.color.windowTextActive = "#f4f4f4";
    //         this.launchbarComponent._theme.color.launchbarColor = "0d0d0e"+'b2';
    //         this.launchbarComponent._theme.color.launchbarText = text;
    //         this.launchbarComponent._theme.color.launchbarMenuColor = newColor;
    //         this.launchbarComponent._theme.color.launchbarMenuText = text;
    //         this.launchbarComponent.changeTheme.emit(this.launchbarComponent._theme);
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

}
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
