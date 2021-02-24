/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Inject } from '@angular/core';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  public launchMetadata: any;

  constructor(
    @Inject(Angular2InjectionTokens.LOGGER) private logger: ZLUX.ComponentLogger,
  ) { }

  getLaunchMetadata(): Promise<any> {
    return new Promise<any>((resolve) => {
      if ('plugins' in window && 'cordova' in window) {
        (window as any).plugins.intentShim.getIntent(
          (intent: any) => {
            const extras = intent.extras;
            this.launchMetadata = extras;
            resolve(extras);
          },
          () => {
            this.logger.warn('Error getting launch intent');
            resolve(null);
          }
        );
      } else {
        resolve(null);
      }
    });
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
