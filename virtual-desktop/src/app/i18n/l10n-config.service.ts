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
  L10nConfig,
  ProviderType
} from 'angular-l10n';

@Injectable()
export class L10nConfigService {
  constructor(
    private languageLocaleService: LanguageLocaleService
  ) {
  }

  getConfig(): L10nConfig {
    const desktopPlugin = ZoweZLUX.pluginManager.getDesktopPlugin();
    const prefix = ZoweZLUX.uriBroker.pluginResourceUri(desktopPlugin, `assets/i18n/messages.`);
    const config: L10nConfig = {
      locale: {
        defaultLocale: {
          languageCode: this.languageLocaleService.getBaseLanguage(),
          countryCode: this.languageLocaleService.getLocale()
        }
      },
      translation: {
          providers: [
            { type: ProviderType.Static, prefix: prefix },
            { type: ProviderType.Fallback, prefix: prefix, fallbackLanguage: [ISOCode.Language] },
          ],
          composedLanguage: [ISOCode.Language, ISOCode.Country],
          caching: true
      }
    };
    return config;
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
