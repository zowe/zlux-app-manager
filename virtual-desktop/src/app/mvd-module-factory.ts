

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

// Angular
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import { NgModule, Type, APP_INITIALIZER, LOCALE_ID } from '@angular/core';
import { HttpModule } from '@angular/http';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

// Modules
import { PluginManagerModule } from './plugin-manager/plugin-manager.module';
import { ApplicationManagerModule } from './application-manager/application-manager.module';
import { AuthenticationModule } from './authentication-manager/authentication-manager.module';
import { SharedModule } from './shared/shared.module';
import {BrowserPreferencesService} from './shared/browser-preferences.service';

declare var System: any ; // = (window as any).System;

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

  // getLocale(): string {
  //   if (typeof window === 'undefined' || typeof window.navigator === 'undefined') {
  //     return '';
  //   }

  //   let browserLang = 'en-US'; // = window.navigator['languages'] ? window.navigator['languages'][0] : null;
  //   //browserLang = browserLang || window.navigator.language || window.navigator['browserLanguage'] || window.navigator['userLanguage'];

  //   if (browserLang.indexOf('-') !== -1) {
  //     browserLang = browserLang.split('-')[0];
  //   }

  //   if (browserLang.indexOf('_') !== -1) {
  //     browserLang = browserLang.split('_')[0];
  //   }

  //   return 'en';
  // }
}

export function localeIdFactory(localeService: LocaleService) {
  return localeService.getLocale();
}

export function localeInitializer(localeId: string) {
  return (): Promise<any> => {
    return new Promise((resolve, reject) => {

// require gives error
// mvd-module-factory.ts:61 Uncaught TypeError: Cannot read property 'default' of undefined
// at mvd-module-factory.ts:61
// at Object.execCb (require.js:1696)
// at Module.check (require.js:883)
      // (window as any).require( /* webpackIgnore: true */ [`/ZLUX/plugins/com.rs.mvd.ng2desktop/web/@angular/common/locales/${localeId}.js`],
      //                           (localeModule: any) => {
      //   registerLocaleData(localeModule.default);
      //   resolve();

// System.import with ignore gives error:
// externals.js:360 ERROR Error: Uncaught (in promise): Error: Cannot find module "vm".
// Instantiating https://wal-l-rp01:8544/ZLUX/plugins/com.rs.mvd.ng2desktop/web/@angular/common/locales/en.js
// Loading /ZLUX/plugins/com.rs.mvd.ng2desktop/web/@angular/common/locales/en.js
// Error: Cannot find module "vm".
//   at De.n [as _nodeRequire] (dist sync:2)
//   at te (system.js:4)
//   at system.js:4
    //  const System = (window as any).System;
    //   System.import(/* webpackIgnore: true */
    //             `/ZLUX/plugins/com.rs.mvd.ng2desktop/web/@angular/common/locales/${localeId}.js`).then((localeModule: any) => {
    //     registerLocaleData(localeModule.default);
    //     resolve();
    //   })

// This way works, though it would be nice to be able to hide the language files in a subdirectory,
// and to also give them better names. Also, this doesn't get called when I change the language

                    /*   webpackMode: "lazy"
                       webpackInclude: /en.*\|fr.*\|ru.*\|foo/ */

System.import(/* webpackInclude: /.*desktop.*\.js/ */
                `@angular/common/locales/${localeId}.js`).then((localeModule: any) => {
        registerLocaleData(localeModule.default);
        resolve();
      })

    // import ignores the webpackIgnore and embeds all the locale info
    // import(/* webpackIgnore: true */
    //           `@angular/common/locales/${localeId}.js`).then((localeModule: any) => {
    //   registerLocaleData(localeModule.default);
    //   resolve();
    // })
  });
  };
}

export class MvdModuleFactory {
  static generateModule(windowManagerModule: Type<any>, mainComponent: Type<any>): Type<any> {
    return NgModule({
      imports: [
        BrowserModule,
        BrowserAnimationsModule,
        HttpModule,
        // Our stuff,
        SharedModule,
        PluginManagerModule,
        windowManagerModule,
        ApplicationManagerModule,
        AuthenticationModule
      ],
      declarations: [mainComponent],
      providers: [
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        BrowserPreferencesService,
        LocaleService,
        { provide: LOCALE_ID, useFactory: localeIdFactory, deps: [LocaleService] },
        {
          provide: APP_INITIALIZER,
          multi: true,
          useFactory: localeInitializer,
          deps: [LOCALE_ID]
        }
          ],
      bootstrap: [mainComponent]
    })(class MvdModule {});
  }
}


             /* webpackMode: "lazy"
                webpackExclude: /\.ts$/
                webpackChunkName: "testing" */

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

