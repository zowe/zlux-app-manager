/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';
import { L10nConfig, L10nLocale } from 'angular-l10n';
import { LanguageLocaleService } from './language-locale.service';

@Injectable()
export class L10nConfigService {
  constructor(
    private languageLocaleService: LanguageLocaleService
  ) {
  }

  getDefaultLocale(): L10nLocale {
    const language = this.languageLocaleService.getLanguage();
    const locale = this.languageLocaleService.getLocale();
    const composedLanguage = locale ? `${language}-${locale}` : language;
    return {
      language: composedLanguage
    };
  }

  getL10nConfig(plugin: ZLUX.Plugin): L10nConfig {
    return <L10nConfig>{
      format: 'language-region',
      providers: [
        { name: 'app', asset: null, options: { plugin } },
      ],
      cache: true,
      keySeparator: '.',
      defaultLocale: this.getDefaultLocale(),
      schema: [],
    };
  }

  getTranslationProviders(_plugin: ZLUX.Plugin): any[] {
    //const prefix = ZoweZLUX.uriBroker.pluginResourceUri(plugin, `assets/i18n/messages.`);
    return [
      // messages.en.json - a fallback file in case there is no translation file for a given language found
      // { type: ProviderType.Fallback, prefix: `${prefix}en`, fallbackLanguage: [] },
      // e.g. messages.es.json
      // { type: ProviderType.Fallback, prefix: prefix, fallbackLanguage: [ISOCode.Language] },
      // e.g. messages.es-ES.json
      // { type: ProviderType.Static, prefix: prefix }
    ];
  }

 }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
