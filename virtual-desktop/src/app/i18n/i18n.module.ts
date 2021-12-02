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
import { L10nConfig, L10nIntlModule, L10nTranslationModule, L10nTranslationService } from 'angular-l10n';
import { L10nStorageService } from './l10n-storage.service';
import { L10nConfigService } from './l10n-config.service';
import { L10nTranslationLoaderService } from './l10n-translation-loader.service';

export const l10nConfig: L10nConfig = {
  format: 'language-region',
  providers: [
    { name: 'app', asset: null, options: {plugin:  ZoweZLUX.pluginManager.getDesktopPlugin()} },
  ],
  cache: true,
  keySeparator: '.',
  defaultLocale: { language: 'en-US' },
  schema: [],
};
@NgModule({
  imports: [
    HttpClientModule,
    L10nTranslationModule.forRoot(
       l10nConfig,
       {
         translationLoader: L10nTranslationLoaderService,
         storage: L10nStorageService,
       }
     ),
    L10nIntlModule
  ],
  providers: [
    L10nConfigService,
    { provide: LOCALE_ID, useFactory: localeIdFactory, deps: [LanguageLocaleService] },
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: localeInitializer,
      deps: [LanguageLocaleService, LOCALE_ID]
    }
  ]
})
export class I18nModule {
  constructor(private translation: L10nTranslationService) {
    this.translation.init();
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

