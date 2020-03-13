

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { CommonModule } from '@angular/common';
import { NgModule, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ZluxButtonModule, ZluxPopupManagerModule } from '@zlux/widgets';

// import { L10nConfig, L10nLoader, TranslationModule, StorageStrategy, ProviderType } from 'angular-l10n';
import {
  TranslationModule, L10nConfig, ISOCode, L10nLoader, LOCALE_CONFIG,
  TRANSLATION_CONFIG, LocaleConfig, TranslationConfig
} from 'angular-l10n';
import { Angular2L10nConfig, Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { AppComponent } from './app.component';
import { BrowserModule } from './browser/browser.module';


const l10nConfig: L10nConfig = {
  translation: {
    providers: [],
    composedLanguage: [ISOCode.Language, ISOCode.Country],
    caching: true,
    missingValue: 'No key'
  }
};


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    // BrowserModule, /* remove this for within-MVD development */
    CommonModule,
    FormsModule,
    BrowserModule,
    ZluxButtonModule,
    ZluxPopupManagerModule,
    TranslationModule.forRoot(l10nConfig)
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(
    private l10nLoader: L10nLoader,
    @Inject(Angular2InjectionTokens.L10N_CONFIG) private l10nConfig: Angular2L10nConfig,
    @Inject(LOCALE_CONFIG) private localeConfig: LocaleConfig,
    @Inject(TRANSLATION_CONFIG) private translationConfig: TranslationConfig,

  ) {
    this.localeConfig.defaultLocale = this.l10nConfig.defaultLocale;
    this.translationConfig.providers = this.l10nConfig.providers;
    this.l10nLoader.load();
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

