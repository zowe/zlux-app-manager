/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { CommonModule } from '@angular/common';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { cordovaLogger, CordovaResources } from 'bootstrap/cordova-resources';
import { ApiRequestInterceptor } from './api.interceptor';
import { MobileComponent } from './mobile.component';
import { PluginManager } from 'zlux-base/plugin-manager/plugin-manager';
import { Plugin } from 'zlux-base/plugin-manager/plugin';
import { LoginComponent } from './login/login.component';
import { pluginModule, pluginComponent } from 'webapp/plugin';
import { ErrorInterceptor } from './error.interceptor';
import { ConfigService } from './config.service';
import pluginDefinition from './../../../../pluginDefinition.json';
import { MobileRoutingModule } from './mobile-routing.module';
import { ZluxButtonModule, ZluxPopupManagerModule } from '@zlux/widgets';

(window as any).ZoweZLUX = CordovaResources;

export function appLoadFactory(config: ConfigService): () => Promise<any> {
  return () => config.getLaunchMetadata();
}

@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule,
    MobileRoutingModule,
    pluginModule
  ],
  declarations: [
    MobileComponent,
    LoginComponent,
  ],
  providers: [
    { provide: Angular2InjectionTokens.LOGGER, useValue: cordovaLogger },
    {
      provide: APP_INITIALIZER,
      useFactory: appLoadFactory,
      deps: [ConfigService, Angular2InjectionTokens.LOGGER],
      multi: true,
    },
    { provide: PluginManager, useValue: CordovaResources.pluginManager },
    { provide: Angular2InjectionTokens.L10N_CONFIG, useValue: { defaultLocale: { languageCode: 'en' }, providers: [] } },
    { provide: Angular2InjectionTokens.PLUGIN_DEFINITION, useValue: Plugin.parsePluginDefinition(pluginDefinition) },
    {
      provide: Angular2InjectionTokens.LAUNCH_METADATA,
      useFactory: (config: ConfigService) => config.launchMetadata,
      deps: [ConfigService]
    },
    { provide: HTTP_INTERCEPTORS, useClass: ApiRequestInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
  ],
  bootstrap: [MobileComponent]
})
export class MobileAppModule {
  constructor() {
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

