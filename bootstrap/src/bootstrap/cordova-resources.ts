

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { PluginManager } from 'zlux-base/plugin-manager/plugin-manager'
import { MvdUri } from '../uri/mvd-uri'
import { Dispatcher } from 'zlux-base/dispatcher/dispatcher'
import { Logger } from '../../../../zlux-shared/src/logging/logger'
import { Registry } from 'zlux-base/registry/registry'
import { ZoweNotificationManager } from 'zlux-base/notification-manager/notification-manager'
import { SimpleGlobalization } from '../i18n/simple-globalization'

declare var window: {
  ZoweZLUX: typeof CordovaResources,
  COM_RS_COMMON_LOGGER: Logger
  plugins: any;
};
window; /* Suppress TS error */

const logger = new Logger();
logger.addDestination(logger.makeDefaultDestination(true, true, true, true, true));
window.COM_RS_COMMON_LOGGER = logger;

export const cordovaLogger: ZLUX.ComponentLogger = logger.makeComponentLogger("_zsf.mobile");
/*
We don't know the URL of zlux-app-server yet...

fetch('/ZLUX/plugins/org.zowe.zlux.bootstrap/web/assets/i18n/log/messages_en.json')
  .then((response) => {
    return response.json();
  })
  .then((myJson) => {
    (cordovaLogger as any)._messages = myJson;
  })
  .catch((e) => {
    cordovaLogger.warn("ZWED5000E - Unable to retrieve message resource file: messages_en.json\n", e);
  });
*/
PluginManager.logger = cordovaLogger;

export class CordovaDispatcher extends Dispatcher implements ZLUX.Dispatcher {

  constructor(private logger: ZLUX.ComponentLogger) {
    super(logger);
  }

  invokeAction(action: ZLUX.Action, eventContext: any, _targetId?: number | undefined): Promise<void> {
    return new Promise((resolve, reject) => {
      const intent = action.targetPluginID ? {
        component: {
          package: action.targetPluginID,
          class: action.targetPluginID + '.MainActivity',
        },
        extras: eventContext
      } : eventContext;
      window.plugins.intentShim.startActivity(
        intent,
        () => resolve(),
        (e: any) => reject(e)
      );
    });
  }
}

export class CordovaResources {
  static pluginManager = PluginManager
  static uriBroker: ZLUX.UriBroker = new MvdUri();
  static dispatcher: Dispatcher = new CordovaDispatcher(cordovaLogger);
  static logger: Logger = logger;
  static registry: ZLUX.Registry = new Registry();
  static notificationManager: ZoweNotificationManager = new ZoweNotificationManager();
  // currently replaced in plugin-manager.module
  static globalization: ZLUX.Globalization = new SimpleGlobalization();
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
