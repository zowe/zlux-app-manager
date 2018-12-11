/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';
import { LanguageLocaleService } from './language-locale.service';
import {
  ISOCode,
  ProviderType
} from 'angular-l10n';
import { DefaultLocaleCodes } from 'angular-l10n/src/models/types';

@Injectable()
export class L10nConfigService {
  constructor(
    private languageLocaleService: LanguageLocaleService
  ) {
  }

  getDefaultLocale(): DefaultLocaleCodes {
    return {
      languageCode: this.languageLocaleService.getBaseLanguage(),
      countryCode: this.languageLocaleService.getLocale()
    };
  }

  getTranslationProviders(plugin: ZLUX.Plugin): any[] {
    const prefix = ZoweZLUX.uriBroker.pluginResourceUri(plugin, `assets/i18n/messages.`);
    return [
      // messages.en.json - a fallback file in case there is no translation file for a given language found
      { type: ProviderType.Fallback, prefix: `${prefix}en`, fallbackLanguage: [] },
      // e.g. messages.es.json
      { type: ProviderType.Fallback, prefix: prefix, fallbackLanguage: [ISOCode.Language] },
      // e.g. messages.es-ES.json
      { type: ProviderType.Static, prefix: prefix }
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
