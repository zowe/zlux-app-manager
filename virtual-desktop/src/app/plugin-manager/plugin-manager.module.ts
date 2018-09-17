

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { NgModule, APP_INITIALIZER, LOCALE_ID  } from '@angular/core';
import { registerLocaleData } from '@angular/common';

import { PluginManager } from './shared/plugin-manager';
import { PluginLoader } from './shared/plugin-loader';
import { Angular2PluginFactory } from './plugin-factory/angular2/angular2-plugin-factory';
import { IFramePluginFactory } from './plugin-factory/iframe/iframe-plugin-factory';
import { ReactPluginFactory } from './plugin-factory/react/react-plugin-factory';

interface I18nInfo {
  language?: string;
  locale?: string;
}

export class LocaleService {

  getCookies(): any {
    const cookieStrings: string[] = document.cookie.split(';');
    const cookies: any = {};

    for (const cookieString of cookieStrings) {
      const pair: string[] = cookieString.split('=');
      const left: string = pair[0];
      const right: string = pair[1];

      cookies[left.trim()] = right && right.trim();
    }

    return cookies;
  }

  getCookie(key: string): string {
    const cookies = this.getCookies();

    return cookies[key];
  }

  getI18nInfo(): I18nInfo {
    const cookies: any = this.getCookies();
    const prefix: string = 'com.rs.mvd.ng2desktop';

    return {
      language: cookies[`${prefix}.language`],
      locale: cookies[`${prefix}.locale`]
    } as I18nInfo
  }

  getLocale(): string {
      const i18nInfo: I18nInfo = this.getI18nInfo();
      const configuredLanguage = i18nInfo.language;

      if (configuredLanguage) {
        return configuredLanguage;
      } else {
        return navigator.language.split('-')[0];
      }
    }
}

export function localeIdFactory(localeService: LocaleService) {
  return localeService.getLocale();
}

export function localeInitializer(localeId: string) {
  return (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const baseURI: string = (window as any).RocketMVD.uriBroker.desktopRootUri();
      const paths: any = {};

      // NOTE: static loading using "import" bloated the desktop.js from
      // ~800Kb to 2.2Mb. Using lazy loading with "import" resulted in
      // 1047 .js files and 1047.js.map files in the web folder.
      // "require" seemed cleaner in the end.
      //
      // We're not emulating the whole path in our deployment directory,
      // but we're showing the original paths so it's clear from the this code
      // where the locale files originally come from.
      // They are copied into the web/locales folder during build of the plugin.

      paths[`@angular/common/locales/${localeId}`] = `${baseURI}locales/${localeId}`;
      (window as any).require.config({
        'paths': paths
      });
      (window as any).require([`@angular/common/locales/${localeId}`],
        (res: any) => {
          registerLocaleData(res.default, localeId);
          resolve();
        },
        (err: any) => {
          reject(err);
        }
      );

    });
  };
}


@NgModule({
  providers: [
    Angular2PluginFactory,
    IFramePluginFactory,
    ReactPluginFactory,
    PluginManager,
    PluginLoader,
    /* Expose plugin manager to external window managers */
    { provide: MVDHosting.Tokens.PluginManagerToken, useExisting: PluginManager },
    LocaleService,
    { provide: LOCALE_ID, useFactory: localeIdFactory, deps: [LocaleService] },
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: localeInitializer,
      deps: [LOCALE_ID]
    }
]
})
export class PluginManagerModule {

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

