

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
import { NgModule, Type } from '@angular/core';
import { HttpModule } from '@angular/http';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

// Modules
import { PluginManagerModule } from './plugin-manager/plugin-manager.module';
import { ApplicationManagerModule } from './application-manager/application-manager.module';
import { AuthenticationModule } from './authentication-manager/authentication-manager.module';
import { SharedModule } from './shared/shared.module';
import { BrowserPreferencesService } from './shared/browser-preferences.service';
import { LanguageLocaleService } from './shared/language-locale.service';

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
        LanguageLocaleService
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

