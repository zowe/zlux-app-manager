/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

export class Globalization implements ZLUX.Globalization {


  private readonly plugin: ZLUX.Plugin = ZoweZLUX.pluginManager.getDesktopPlugin();
  private readonly logger = ZoweZLUX.logger.makeComponentLogger(this.plugin.getIdentifier());

  private readonly resourcePath = 'browser-preferences';
  // Maybe this could be a constructor arg in the future
  private readonly preferencePrefix = 'org.zowe.zlux.zlux-app-manager.preferences'; // this.plugin.getIdentifier();



  setPreference(preference: string, value: string): Promise<any> {
    const uri = ZoweZLUX.uriBroker.pluginRESTUri(this.plugin, this.resourcePath, '');
    this.logger.info(`set preference ${preference} to ${value} at uri ${uri}`);
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

  getLanguage(): string {
    const configuredLanguage = this.getPreference('language')

    if (configuredLanguage) {
      return configuredLanguage;
    } else {
      return navigator.language.split('-')[0];
    }
  }

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
