/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Inject, OnInit, Optional } from '@angular/core';
import { Angular2InjectionTokens, Angular2PluginWindowActions } from 'pluginlib/inject-resources';
import { WebBrowserLaunchMetadata, isLaunchMetadata } from './browser/shared';
import { NavigationService, ProxyService, SettingsService } from './browser/services';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {

  constructor(
    private navigation: NavigationService,
    private proxy: ProxyService,
    private settings: SettingsService,
    @Inject(Angular2InjectionTokens.LOGGER) public log: ZLUX.ComponentLogger,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_ACTIONS) private windowActions: Angular2PluginWindowActions,
    @Optional() @Inject(Angular2InjectionTokens.LAUNCH_METADATA) launchMetadata: any
  ) {
    if (launchMetadata && launchMetadata.data) {
      const title = launchMetadata.data.title;
      if (typeof title === 'string' && this.windowActions) {
        console.log('settitle');
        this.windowActions.setTitle(title);
      } else {
        console.log('dontsettitle');
      }
    }
  }

  ngOnInit(): void {
    this.log.debug(`web browser started`);
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
    const { enableProxy, hideControls, url, title } = launchMetaData;
    if (typeof enableProxy === 'boolean' && this.proxy.isEnabled() !== enableProxy) {
      this.proxy.toggle();
    }
    if (typeof hideControls === 'boolean' && !this.settings.areControlsVisible() !== hideControls) {
      this.settings.toggleControls();
    }
    if (typeof url === 'string') {
      this.navigation.navigate(url);
    }
    if (typeof title === 'string' && this.windowActions) {
      console.log('settitle');
      this.windowActions.setTitle(title);
    } else {
      console.log('dontsettitle');
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

