

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
import { ReactPluginComponent } from './plugin-factory/react/react-plugin.component';
import { Globalization } from '../shared/globalization';
import { LanguageLocaleService } from '../shared/language-locale.service';
import { Observable } from 'rxjs/Rx';

const logger: ZLUX.ComponentLogger = ZoweZLUX.logger.makeComponentLogger('org.zowe.zlux.virtual-desktop.plugin-manager');

export function localeIdFactory(localeService: LanguageLocaleService) {
  const zoweGlobal = (window as any).ZoweZLUX;

  // chicken and egg bootstrapping problem. virtual-desktop wants a particular implementation
  // of globalization that can use cookies set by the browser-preferences service of this plugin
  // We may move that service into zlux-proxy-server, then Globalization can maybe move to bootstrap.
  if (!(zoweGlobal.globalization instanceof Globalization)) {
    logger.info('Setting ZoweZLUX.globalization to an implementation specific to com.rs.mvd.ng2desktop')
    zoweGlobal.globalization = localeService.globalization;
  }
  return localeService.getLanguage();
}

function localeInitializer(localeService: LanguageLocaleService, localeId: string) {
  return (): Promise<any> => {
    const baseURI: string = (window as any).ZoweZLUX.uriBroker.desktopRootUri();
    if (localeService.isConfiguredForDefaultLanguage()) {
      return Promise.resolve();
    }
    const baseLanguage: string = localeService.getBaseLanguage();
    const localeFileURL = `${baseURI}locales/${localeId}`;
    const fallbackLocaleFileURL = baseLanguage !== localeId ? `${baseURI}locales/${baseLanguage}` : null;
    return loadLocale(localeId, localeFileURL)
      .catch(err => (fallbackLocaleFileURL != null) ? loadLocale(baseLanguage, fallbackLocaleFileURL) : Observable.of({}))
      .toPromise()
      .catch(err => {})
  };
}

function loadLocale(localeId: string, url: string): Observable<any> {
  // NOTE: static loading using "import" bloated the desktop.js from
  // ~800Kb to 2.2Mb. Using lazy loading with "import" resulted in
  // 1047 .js files and 1047.js.map files in the web folder.
  // "require" seemed cleaner in the end.
  //
  // We're not emulating the whole path in our deployment directory,
  // but we're showing the original paths so it's clear from the this code
  // where the locale files originally come from.
  // They are copied into the web/locales folder during build of the plugin.

  return new Observable(observer => {
    const path = `@angular/common/locales/${localeId}`;
    const paths: any = {};
    paths[path] = url;
    (window as any).require.config({paths: paths});
    (window as any).require([path],
      (res: any) => {
        registerLocaleData(res.default, localeId);
        observer.complete();
      },
      (err: any) => observer.error(err)
    );
  });
}


@NgModule({
  declarations: [
    ReactPluginComponent
  ],
  providers: [
    Angular2PluginFactory,
    IFramePluginFactory,
    ReactPluginFactory,
    PluginManager,
    PluginLoader,
    /* Expose plugin manager to external window managers */
    { provide: MVDHosting.Tokens.PluginManagerToken, useExisting: PluginManager },
    LanguageLocaleService,
    { provide: LOCALE_ID, useFactory: localeIdFactory, deps: [LanguageLocaleService] },
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: localeInitializer,
      deps: [LanguageLocaleService, LOCALE_ID]
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

