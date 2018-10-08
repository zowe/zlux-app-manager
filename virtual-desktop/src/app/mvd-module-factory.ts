

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
import { NgModule, Type, StaticProvider } from '@angular/core';
import { HttpModule } from '@angular/http';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { TRANSLATIONS, TRANSLATIONS_FORMAT, LOCALE_ID } from '@angular/core';

// Modules
import { PluginManagerModule } from './plugin-manager/plugin-manager.module';
import { ApplicationManagerModule } from './application-manager/application-manager.module';
import { AuthenticationModule } from './authentication-manager/authentication-manager.module';
import { SharedModule } from './shared/shared.module';
import { PluginManager } from 'zlux-base/plugin-manager/plugin-manager';

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
      providers: [
        { provide: LocationStrategy, useClass: HashLocationStrategy }
      ],
      bootstrap: [mainComponent]
    })(class MvdModule {});
  }

  public static getTranslationProviders(): Promise<StaticProvider[]> {
    const language: string = 'ru'; // this.languageLocaleService.getLanguage();
    const noProviders: StaticProvider[] = [];
    if (!language || language === 'en') {
      return Promise.resolve(noProviders);
    }
    const translationFile = MvdModuleFactory.getTranslationFileURL(language);
    console.log(`translation file is ${translationFile}`);
    return MvdModuleFactory.getTranslations(translationFile)
      .then( (translations: string ) => [
        { provide: TRANSLATIONS, useValue: translations },
        { provide: TRANSLATIONS_FORMAT, useValue: 'xlf' },
        { provide: LOCALE_ID, useValue: language },
      ])
      .catch(() => noProviders); // ignore if file not found
  }

  private static getTranslationFileURL(language: string): string {
    const desktopPlugin = PluginManager.getDesktopPlugin();
    console.log(`getTranslationFileURL`, PluginManager);
    if (desktopPlugin) {
      return ZoweZLUX.uriBroker.pluginResourceUri(desktopPlugin, `assets/i18n/messages.${language}.xlf`);
    }
    return 'err_no_desktop_plugin';
  }

  private static getTranslations(file: string): Promise<string> {
    return window.fetch(file).then(response => response.text());
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

