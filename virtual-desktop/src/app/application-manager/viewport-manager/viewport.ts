

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

export class Viewport {
  private static nextViewportId: MVDHosting.ViewportId = 0;
  readonly viewportId: MVDHosting.ViewportId;
  readonly providers: Map<string, any>;

  constructor(providers: Map<string, any>) {
    this.viewportId = Viewport.nextViewportId ++;
    this.providers = providers;

    this.checkProviders();
  }

  checkProviders(): void {
    if (!this.providers.has(Angular2InjectionTokens.VIEWPORT_EVENTS)) {
      console.warn('No VIEWPORT_EVENTS provided to custom viewport. This may cause plugins to behave unexpectedly.');
    }

    if (!this.providers.has(Angular2InjectionTokens.PLUGIN_EMBED_ACTIONS)) {
      console.warn('No PLUGIN_EMBED_ACTIONS provided to custom viewport. This may cause plugins to behave unexpectedly.');
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

