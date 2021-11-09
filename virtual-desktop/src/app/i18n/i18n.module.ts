/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { NgModule, APP_INITIALIZER, LOCALE_ID } from '@angular/core';
import { LanguageLocaleService } from './language-locale.service';
import { localeInitializer, localeIdFactory } from './locale-initializer.provider';
import { HttpClientModule } from '@angular/common/http';
import {
  // HttpTranslationProvider,
  //ISOCode,
  // L10nLoader,
  //LOCALE_CONFIG,
  //LocaleConfig,
  //TRANSLATION_CONFIG,
  //TranslationConfig,
  L10nTranslationModule,
  // L10N_CONFIG
} from 'angular-l10n';
// import { L10nStorageService } from './l10n-storage.service';
//import { L10nStorage } from 'angular-l10n';
// import { L10nConfig } from 'angular-l10n';
// import { L10nStorage } from 'angular-l10n';
// import { L10nConfigService } from './l10n-config.service';
//import { L10nCustomTranslationProvider } from './l10n-custom-translation.provider';
// import { TranslationLoaderService } from './translation-loader.service';


@NgModule({
  imports: [
    HttpClientModule,
    L10nTranslationModule.forRoot({
      format: 'language-region',
      cache: true,
      providers: [
        {
          name: 'app', asset: 'asset-abc'
        }
      ],
      keySeparator: '.',
      schema: [],
      defaultLocale: {language: 'en'}
      },
      {
        // translationLoader: TranslationLoaderService
      }
    )
  ],
  providers: [
    //L10nConfigService,
    //L10nStorage,
    // HttpTranslationProvider,
    //L10nCustomTranslationProvider,
    { provide: LOCALE_ID, useFactory: localeIdFactory, deps: [LanguageLocaleService]},
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: localeInitializer,
      deps: [LanguageLocaleService, LOCALE_ID]
    }
  ]
})
export class I18nModule {
  constructor(
    //private l10nLoader: L10nLoader,
    //@Inject(LOCALE_CONFIG) private localeConfig: LocaleConfig,
    //@Inject(TRANSLATION_CONFIG) private translationConfig: TranslationConfig,
    // private l10nConfigService: L10nConfigService,
  ) {
    //const desktopPlugin = ZoweZLUX.pluginManager.getDesktopPlugin();
    //this.localeConfig.defaultLocale = this.l10nConfigService.getDefaultLocale();
    //this.translationConfig.providers = this.l10nConfigService.getTranslationProviders(desktopPlugin);
    //this.l10nLoader.load();
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

