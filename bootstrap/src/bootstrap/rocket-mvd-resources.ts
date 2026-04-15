

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
import { Environment } from 'zlux-base/environment/environment'
import { Logger } from '../../../../zlux-shared/src/logging/logger'
import { Registry } from 'zlux-base/registry/registry'
import { ZoweNotificationManager } from 'zlux-base/notification-manager/notification-manager'
import { SimpleGlobalization } from '../i18n/simple-globalization'

// This is the core logger
let logger = new Logger();
logger.addDestination(logger.makeDefaultDestination(true,true,true,true,true));
window.COM_RS_COMMON_LOGGER = logger;

// component logger
export var bootstrapLogger : ZLUX.ComponentLogger = logger.makeComponentLogger("_zsf.bootstrap");

let environment = new Environment();

fetch('/ZLUX/plugins/org.zowe.zlux.bootstrap/web/assets/i18n/log/messages_en.json')
  .then((response) => {
    return response.json();
  })
  .then((myJson) => {
    (bootstrapLogger as any)._messages = myJson;
  })
  .catch((e) => {
    bootstrapLogger.warn("ZWED5000E - Unable to retrieve message resource file: messages_en.json\n", e);
  });

  PluginManager.logger = bootstrapLogger;

// TODO: Possible duplicate in index.d.ts in zlux-platform ???
export class ZoweZLUXResources {
  static pluginManager = PluginManager
  static environment:Environment = environment
  static uriBroker:ZLUX.UriBroker = new MvdUri(environment);
  static dispatcher:Dispatcher = new Dispatcher(bootstrapLogger);
  static logger:Logger = logger;
  static registry:ZLUX.Registry = new Registry();
  static notificationManager:ZoweNotificationManager = new ZoweNotificationManager();
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
