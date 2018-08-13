

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { PluginManager } from 'zlux-base/plugin-manager/plugin-manager' 
import { DsmUri } from '../uri/dsm-uri'
import { Dispatcher } from 'zlux-base/dispatcher/dispatcher' 
import { Logger } from '../../../../zlux-shared/src/logging/logger'
import { Registry } from 'zlux-base/registry/registry' 
// import { VirtualDesktopAdapter } from '../abstract-virtual-desktop/virtual-desktop-adapter'

declare var window: { RocketMVD: typeof DSMResources };
window; /* Suppress TS error */
let logger = new Logger();
logger.addDestination(logger.makeDefaultDestination(true,true,true));
export class DSMResources {
  static PluginManager = PluginManager
  static uriBroker:ZLUX.UriBroker = new DsmUri();
  static dispatcher:Dispatcher = new Dispatcher(logger);
  static logger:Logger = logger;
  static registry:ZLUX.Registry = new Registry()
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

