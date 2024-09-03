/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable /*, Inject */ } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { BaseLogger } from '../shared/logger';
import { Globalization } from './globalization';

@Injectable()
export class LanguageLocaleService {

  private readonly logger: ZLUX.ComponentLogger = BaseLogger;

  readonly globalization: Globalization = new Globalization();

  constructor(
  ) {
    const lang = this.getLanguage();
    if (document.documentElement) {
      document.documentElement.lang = lang;
    }
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
    const baseURI: string = ZoweZLUX.uriBroker.desktopRootUri();
    return `${baseURI}locales/${localeId}`;
  }

  checkForLocaleFile(localeId: string): Observable<any> {
    const uri = `${this.makeLocaleURI(localeId)}.js`;
    // From lchudinov: This code is called before Angular's Http API is initialized,
    // hence the call to window.fetch.
    return from(window.fetch(uri).then(res => {
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
      return from(this.globalization.setPreference(preferenceName, requestedValue));
    } else {
      return this.checkForLocaleFile(requestedValue).pipe(
        mergeMap((value: any) => {
        if (value) {
          return from(this.globalization.setPreference(preferenceName, requestedValue));
        } else {
          const message: string = `ZWED5169W - no locale data found for locale id ${value}`;
          this.logger.warn(message)
          return throwError(message);
        }
      }));
    }
  }

  setLanguage(language: string): Observable<any> {
    this.logger.debug("ZWED5313I", language) //this.logger.debug(`Attempting to set language to ${language}`)
    return this.setLanguageOrLocale('language', language);
  }

  setLocale(locale: string): Observable<any> {
    return this.setLanguageOrLocale('locale', locale);
  }

}
