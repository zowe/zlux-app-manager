/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable /*, Inject */ } from '@angular/core';
import { Http } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';

import { BrowserPreferencesService } from './browser-preferences.service'
//import { throwError } from 'rxjs/internal/observable/throwError';
//import { throwError } from 'rxjs/internal/observable/throwError';

// import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

@Injectable()
export class LanguageLocaleService {

  // hacks until I learn the right way to get the plugin and logger down to here via injection
  // or some other "angular" way.
  private readonly plugin: ZLUX.Plugin = RocketMVD.PluginManager.getDesktopPlugin();
  private readonly logger = RocketMVD.logger.makeComponentLogger(this.plugin.getIdentifier());

  constructor(
    // I couldn't figure out how to get the injections to work.
    // @Inject(Angular2InjectionTokens.LOGGER) private logger: ZLUX.ComponentLogger,
    // @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    private browserPreferences: BrowserPreferencesService,
    private http: Http
  ) {
  }

  getLanguage(): string {
    return this.browserPreferences.getPreference('language');
  }

  makeLocaleURI(localeId: string): string {
    const baseURI: string = (window as any).RocketMVD.uriBroker.desktopRootUri();
    return `${baseURI}locales/${localeId}`;
  }

  checkForLocaleFile(localeId: string): Observable<any> {
    const uri = `${this.makeLocaleURI(localeId)}.js`;
    return this.http.get(uri);
  }

  /**
   * For both locale and language choices, we check if there is a corresponding locale file
   * and reject the choice if none is found.
   *
   * @param preferenceName either 'language' or 'locale'
   * @param requestedValue
   */
  private setLanguageOrLocale(preferenceName: string, requestedValue: string): Observable<any> {
    if (requestedValue == null) {
      // clear the preference, other code will revert to using the browser-specified lang/locale
      return this.browserPreferences.setPreference(preferenceName, requestedValue);
    } else {
      return this.checkForLocaleFile(requestedValue).mergeMap((value: any) => {
        if (value) {
          return this.browserPreferences.setPreference(preferenceName, value);
        } else {
          const message: string = `no locale data found for locale id ${value}`;
          this.logger.warn(message)
          return Observable.throwError(message);
        }
      });
    }
  }

  setLanguage(language: string): Observable<any> {
    this.logger.debug(`Attempting to set language to ${language}`)
    return this.setLanguageOrLocale('language', language);
  }

  setLocale(locale: string): Observable<any> {
    return this.setLanguageOrLocale('locale', locale);
  }

}
