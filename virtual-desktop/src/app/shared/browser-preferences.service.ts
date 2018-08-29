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

//import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

interface I18nInfo {
  language?: string;
  locale?: string;
}

@Injectable()
export class BrowserPreferencesService {

  // hacks until I learn the right way to get the plugin and logger down to here via injection
  // or some other "angular" way.
  private readonly plugin: ZLUX.Plugin = RocketMVD.PluginManager.getDesktopPlugin();
  private readonly logger = RocketMVD.logger.makeComponentLogger(this.plugin.getIdentifier());

  private readonly resourcePath = 'browser-preferences';

  constructor(
    // I couldn't figure out how to get the injections to work.
//    @Inject(Angular2InjectionTokens.LOGGER) private logger: ZLUX.ComponentLogger,
//    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    private http: Http,
  ) {
  }

  setPreference(preference: string, value: string): Observable<any> {
    const uri = RocketMVD.uriBroker.pluginRESTUri(this.plugin, this.resourcePath, '');
    this.logger.info(`set preference ${preference} to ${value} at uri ${uri}`);
    const body: any = {};
    body[preference] = value;

    return this.http.post(uri, body);
  }

  getCookies(): any {
    const cookieStrings: string[] = document.cookie.split(';');
    const cookies: any = {};

    for (const cookieString of cookieStrings) {
      const pair: string[] = cookieString.split('=');
      const left: string = pair[0];
      const right: string = pair[1];

      cookies[left.trim()] = right && right.trim();
    }

    return cookies;
  }

  getCookie(key: string): string {
    const cookies = this.getCookies();

    return cookies[key];
  }

  getI18nInfo(): I18nInfo {
    const cookies: any = this.getCookies();
    const prefix: string = 'com.rs.mvd.ng2desktop';

    return {
      language: cookies[`${prefix}.language`],
      locale: cookies[`${prefix}.locale`]
    } as I18nInfo
  }

  getLanguage(): string {
    const i18nInfo: I18nInfo = this.getI18nInfo();
    const configuredLanguage = i18nInfo.language;

    if (configuredLanguage) {
      return configuredLanguage;
    } else {
      return navigator.language.split('-')[0];
    }
  }

}
