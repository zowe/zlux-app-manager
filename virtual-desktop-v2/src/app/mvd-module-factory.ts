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
// import { HttpModule } from '@angular/http';
import { HttpClientModule } from '@angular/common/http';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

// Modules
import { PluginManagerModule } from './plugin-manager/plugin-manager.module';
import { ApplicationManagerModule } from './application-manager/application-manager.module';
import { AuthenticationModule } from './authentication-manager/authentication-manager.module';
import { SharedModule } from './shared/shared.module';
import { LanguageLocaleService } from './i18n/language-locale.service';
import { TranslationLoaderService } from './i18n/translation-loader.service';
import { I18nModule } from './i18n/i18n.module';

export class MvdModuleFactory {
  private static localeService: LanguageLocaleService;
  private static translationLoaderService: TranslationLoaderService;

  static generateModule(windowManagerModule: Type<any>, mainComponent: Type<any>): Type<any> {
    return NgModule({
      imports: [
        BrowserModule,
        BrowserAnimationsModule,
        // HttpModule,
        HttpClientModule,
        // Our stuff,
        SharedModule,
        PluginManagerModule,
        I18nModule,
        windowManagerModule,
        ApplicationManagerModule,
        AuthenticationModule
      ],
      providers: [
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        { provide: LanguageLocaleService, useFactory: MvdModuleFactory.getLocaleService},
        { provide: TranslationLoaderService, useFactory: MvdModuleFactory.getTranslationLoaderService}
      ],
      bootstrap: [mainComponent]
    })(class MvdModule {});
  }

  public static getTranslationProviders(): Promise<StaticProvider[]> {
    const translationLoader = MvdModuleFactory.getTranslationLoaderService();
    return translationLoader.getTranslationProviders(ZoweZLUX.pluginManager.getDesktopPlugin());
  }

  private static getLocaleService(): LanguageLocaleService {
    if (!MvdModuleFactory.localeService) {
      MvdModuleFactory.localeService = new LanguageLocaleService();
    }
    return MvdModuleFactory.localeService;
  }

  private static getTranslationLoaderService(): TranslationLoaderService {
    if (!MvdModuleFactory.translationLoaderService) {
      const languageLocaleService = MvdModuleFactory.getLocaleService();
      MvdModuleFactory.translationLoaderService = new TranslationLoaderService(languageLocaleService);
    }
    return MvdModuleFactory.translationLoaderService;
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

