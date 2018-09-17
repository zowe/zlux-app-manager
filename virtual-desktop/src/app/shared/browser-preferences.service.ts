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

// import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

@Injectable()
export class BrowserPreferencesService {

  // hacks until I learn the right way to get the plugin and logger down to here via injection
  // or some other "angular" way.
  private readonly plugin: ZLUX.Plugin = RocketMVD.PluginManager.getDesktopPlugin();
  private readonly logger = RocketMVD.logger.makeComponentLogger(this.plugin.getIdentifier());

  private readonly resourcePath = 'browser-preferences';
  // Maybe this could be a constructor arg in the future
  private readonly preferencePrefix = this.plugin.getIdentifier();

  constructor(
    // I couldn't figure out how to get the injections to work.
    // @Inject(Angular2InjectionTokens.LOGGER) private logger: ZLUX.ComponentLogger,
    // @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    private http: Http,
  ) {
  }

  setPreference(preference: string, value: string): Observable<any> {
    const uri = RocketMVD.uriBroker.pluginRESTUri(this.plugin, this.resourcePath, '');
    this.logger.info(`set preference ${preference} to ${value} at uri ${uri}`);
    const body: any = {};
    body[`${this.preferencePrefix}.${preference}`] = value;

    return this.http.post(uri, body);
  }

  getPreferences(): any {
    // this is the only part of the client code that knows the preferences
    // are cookies
    const cookieStrings: string[] = document.cookie.split(';');
    const preferences: any = {};

    for (const cookieString of cookieStrings) {
      const pair: string[] = cookieString.split('=');
      // apparently the cookieString is not reliable with regard to where the spaces are
      const left: string = pair[0].trim();

      if (left.startsWith(this.preferencePrefix)) {
        const key = left.substring(this.preferencePrefix.length + 1).trim();
        const right: string = pair[1];
        preferences[key] = right && right.trim();
      }
    }

    return preferences;
  }

  getPreference(key: string): string {
    const preferences = this.getPreferences();

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

  setLanguage(language: string): Observable<any> {
    return this.setPreference('language', language);
  }

  setLocale(locale: string): Observable<any> {
    return this.setPreference('locale', locale);
  }

}
