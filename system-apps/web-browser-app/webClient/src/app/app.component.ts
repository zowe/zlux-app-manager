

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Inject } from '@angular/core';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { LocaleService, TranslationService } from 'angular-l10n';
import { WebBrowserLaunchMetadata, isLaunchMetadata } from './browser/shared';
import { NavigationService, ProxyService, SettingsService } from './browser/services';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {

  constructor(
    public locale: LocaleService,
    public translation: TranslationService,
    @Inject(Angular2InjectionTokens.LOGGER) public log: ZLUX.ComponentLogger,
    private navigation: NavigationService,
    private proxy: ProxyService,
    private settings: SettingsService,
  ) {
  }

  ngOnInit(): void {
    this.log.info(`web browser started`);
  }

  provideZLUXDispatcherCallbacks(): ZLUX.ApplicationCallbacks {
    return {
      onMessage: (eventContext: any): Promise<any> => this.zluxOnMessage(eventContext)
    }
  }

  private zluxOnMessage(eventContext: any): Promise<void> {
    if (isLaunchMetadata(eventContext)) {
      this.handleLaunchMetadata(eventContext.data);
      return Promise.resolve();
    }
    return Promise.reject(`Event context missing or malformed`);
  }

  private handleLaunchMetadata(launchMetaData: Partial<WebBrowserLaunchMetadata>): void {
    const { enableProxy, hideControls, url } = launchMetaData;
    if (typeof enableProxy === 'boolean' && this.proxy.isEnabled() !== enableProxy) {
      this.proxy.toggle();
    }
    if (typeof hideControls === 'boolean' && !this.settings.areControlsVisible() !== hideControls) {
      this.settings.toggleControls();
    }
    if (typeof url === 'string') {
      this.navigation.navigate(url);
    }
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

