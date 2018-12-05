/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable /*, Inject */ } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/mergeMap';
import { fromPromise } from 'rxjs/observable/fromPromise';

import { Globalization } from './globalization';

@Injectable()
export class LanguageLocaleService {

  private readonly plugin: ZLUX.Plugin = ZoweZLUX.pluginManager.getDesktopPlugin();
  private readonly logger = ZoweZLUX.logger.makeComponentLogger(this.plugin.getIdentifier());

  readonly globalization: Globalization = new Globalization();

  constructor(
  ) {
  }

  getLanguage(): string {
    return this.globalization.getLanguage();
  }

  getBaseLanguage(): string {
    const language = this.getLanguage();
    return language.split('-')[0];
  }

  isConfiguredForDefaultLanguage(): boolean {
    const language = this.getLanguage();
    return  !language || language === 'en-US' || language === 'en';
  }

  getLocale(): string {
    return this.globalization.getLocale();
  }

  makeLocaleURI(localeId: string): string {
    const baseURI: string = (window as any).ZoweZLUX.uriBroker.desktopRootUri();
    return `${baseURI}locales/${localeId}`;
  }

  checkForLocaleFile(localeId: string): Observable<any> {
    const uri = `${this.makeLocaleURI(localeId)}.js`;
    // From lchudinov: This code is called before Angular's Http API is initialized,
    // hence the call to window.fetch.
    return fromPromise(window.fetch(uri).then(res => {
      if (res.ok) {
        return res.text();
      }
      throw new Error(`${res.status} ${res.statusText}`);
    }));
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
      return fromPromise(this.globalization.setPreference(preferenceName, requestedValue));
    } else {
      return this.checkForLocaleFile(requestedValue).mergeMap((value: any) => {
        if (value) {
          return fromPromise(this.globalization.setPreference(preferenceName, requestedValue));
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
