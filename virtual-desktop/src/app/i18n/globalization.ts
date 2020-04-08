/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { BaseLogger } from '../shared/logger';

export class Globalization implements ZLUX.Globalization {


  private readonly plugin: ZLUX.Plugin = ZoweZLUX.pluginManager.getDesktopPlugin();
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;

  private readonly resourcePath = 'browser-preferences';
  // Maybe this could be a constructor arg in the future
  private readonly preferencePrefix = 'org.zowe.zlux.zlux-app-manager.preferences'; // this.plugin.getIdentifier();

  constructor() {
  }

  setPreference(preference: string, value: string): Promise<any> {
    const uri = ZoweZLUX.uriBroker.pluginRESTUri(this.plugin, this.resourcePath, '');
    this.logger.info(`ZWED5049I`, preference, value, uri); /*this.logger.info(`set preference ${preference} to ${value} at uri ${uri}`);*/
    const body: any = {};
    body[`${this.preferencePrefix}.${preference}`] = value;

    return new Promise(function (resolve, reject) {
      const xhr: XMLHttpRequest = new XMLHttpRequest();
      xhr.open('POST', uri);

      xhr.onload = function () {
        const status: number = this.status;
        if (status >= 200 && status < 300) {
          resolve(xhr.response);
        } else {
          reject(xhr.response)
        }
      }

      xhr.onerror = function () {
        reject(xhr.response);
      }

      xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');

      xhr.send(JSON.stringify(body));

    });
  }

  getPreferences(preferencePrefix: string): any {
    // this is the only part of the client code that knows the preferences
    // are cookies
    const cookieStrings: string[] = document.cookie.split(';');
    const preferences: any = {};

    for (const cookieString of cookieStrings) {
      const pair: string[] = cookieString.split('=');
      // apparently the cookieString is not reliable with regard to where the spaces are
      const left: string = pair[0].trim();

      if (left.startsWith(preferencePrefix)) {
        const key = left.substring(this.preferencePrefix.length + 1).trim();
        const right: string = pair[1];
        preferences[key] = right && right.trim();
      }
    }

    return preferences;
  }

  getPreference(key: string): string {
    const preferences = this.getPreferences(this.preferencePrefix);

    return preferences[key];
  }

  /**
   * @returns The one or two-part language (the ISO-639 language abbreviation and optional ISO-3166 country code
   * e.g., 'en' or 'en-US'). 
   * This defaults to the navigator.language, but can be overriden by setLanguage
   */
  getLanguage(): string {
    const configuredLanguage = this.getPreference('language')

    if (configuredLanguage) {
      return configuredLanguage;
    } else {
      return navigator.language;
    }
  }

  /**
   * @returns the ISO-3166 country code. This defaults to the subtag of the navigator.language(if present), but
   * can be overriden by setLocale. If no subtag is provided, this will return US
   * NOTE: this locale can differ from the ISO-3166 country code of the navigator.language. This option is provided
   * in light of the recommendations from W3C: https://www.w3.org/International/questions/qa-accept-lang-locales
   */
  getLocale(): string {
    const configuredLanguage = this.getPreference('locale')

    if (configuredLanguage) {
      return configuredLanguage;
    } else {
      const navigatorLanguage: string[] = navigator.language.split('-');
      if (navigatorLanguage && navigatorLanguage.length > 1) {
        return navigatorLanguage[1];
      } else {
        return 'US';
      }
    }
  }

  setLanguage(language: string): Promise<any> {
    return this.setPreference('language', language);
  }

  setLocale(locale: string): Promise<any> {
    return this.setPreference('locale', locale);
  }

}
