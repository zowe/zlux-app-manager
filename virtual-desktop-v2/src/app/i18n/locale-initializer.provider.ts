/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { registerLocaleData } from '@angular/common';
import { Globalization } from './globalization';
import { LanguageLocaleService } from './language-locale.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const logger: ZLUX.ComponentLogger = ZoweZLUX.logger.makeComponentLogger('org.zowe.zlux.virtual-desktop.i18n');

export const localeIdFactory = (localeService: LanguageLocaleService): string => {
  const zoweGlobal = ZoweZLUX;

  // chicken and egg bootstrapping problem. virtual-desktop wants a particular implementation
  // of globalization that can use cookies set by the browser-preferences service of this plugin
  // We may move that service into zlux-proxy-server, then Globalization can maybe move to bootstrap.
  if (!(zoweGlobal.globalization instanceof Globalization)) {
    logger.info('ZWED5050I - Setting ZoweZLUX.globalization to an implementation specific to com.rs.mvd.ng2desktop')
    zoweGlobal.globalization = localeService.globalization;
  }
  return localeService.getLanguage();
}

export const localeInitializer = (localeService: LanguageLocaleService, localeId: string) => {
  return (): Promise<any> => {
    const baseURI: string = ZoweZLUX.uriBroker.desktopRootUri();
    if (localeService.isConfiguredForDefaultLanguage()) {
      return Promise.resolve();
    }
    const baseLanguage: string = localeService.getBaseLanguage();
    const localeFileURL = `${baseURI}locales/${localeId}`;
    const fallbackLocaleFileURL = baseLanguage !== localeId ? `${baseURI}locales/${baseLanguage}` : null;
    return loadLocale(localeId, localeFileURL).pipe(
      catchError(err => (fallbackLocaleFileURL != null) ? loadLocale(baseLanguage, fallbackLocaleFileURL) : of({}))
    )
    .toPromise()
    .catch(_err => {})
  };
}

const loadLocale = (localeId: string, url: string): Observable<any> => {
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

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

