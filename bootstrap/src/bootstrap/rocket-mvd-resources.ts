

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
import { NotificationManager } from 'zlux-base/notification-manager/notification-manager'
import { SimpleGlobalization } from '../i18n/simple-globalization'
// import { VirtualDesktopAdapter } from '../abstract-virtual-desktop/virtual-desktop-adapter'

declare var window: { ZoweZLUX: typeof ZoweZLUXResources,
                      COM_RS_COMMON_LOGGER: Logger};
window; /* Suppress TS error */
let logger = new Logger();
logger.addDestination(logger.makeDefaultDestination(true,true,true));
window.COM_RS_COMMON_LOGGER = logger;

export class ZoweZLUXResources {
  static pluginManager = PluginManager
  static uriBroker:ZLUX.UriBroker = new MvdUri();
  static dispatcher:Dispatcher = new Dispatcher(logger);
  static logger:Logger = logger;
  static registry:ZLUX.Registry = new Registry();
  static notificationManager:NotificationManager = new NotificationManager();
  // currently replaced in plugin-manager.module
  static globalization: ZLUX.Globalization = new SimpleGlobalization();
}

const functionMap = new Map<string, any>();

addEventListener('message', receiveMessage, false);


//Acts similar to eval()
//Tokenizes the input by '.' and builds up a complete action 
const resolve = (prefix: string, path: string) => {
  return path.split('.').reduce((obj: any, nextPart: string, i: number) => {
    let res;
    if (i === 0) {
      if (nextPart === 'ZoweZLUX') {
        res = window.ZoweZLUX;
      } else if (nextPart === 'pluginManager' || nextPart === 'PluginManager') {
        res = PluginManager;
      } else {
        res = functionMap.get(`${prefix}-${nextPart}`);
      }
    } else if (obj[nextPart] !== undefined) {
      res = obj[nextPart];
      if (typeof(res) === 'function') {
        res = res.bind(obj);
      }
    }
    // console.log('RES', res);
    for (const a in res) {
      if (!res.hasOwnProperty(a)) {
        continue;
      }

      // console.log(a);
    }
    if (res !== undefined) {
      return res;
    }
    console.log('NEXT ERROR', nextPart);

    throw new ReferenceError(`${nextPart} of ${path} does not exist`);
  }, undefined);
}
//Takes in a message from the iframe, checks the source and then constructs the action
//data.data.factory means that the message was meant to be sent to the iframe-plugin-factory
//data.data.saveResult is a bool that specifies if the result should be saved into the functionMap for later use/reference
//data.data.saveKey specifies the key under which to reference the result
function receiveMessage(event: any) {
  const { data } = event;
  if (!data.data) {
    return;
  }
  if (data.data.factory) {
    return;
  }
  if (data.origin && data.origin === 'zowe') {
    return;
  }
  const prefix = event.origin.replace(/\./g, '_');
  let result;
  const action = data.data && data.data.action;

  let resolvedAction;
  try {
    resolvedAction = action && resolve(prefix, action);
  } catch (e) {
    console.log(`Error in performing action: ${e}` );
  }
  const params = data.data && data.data.params;
  if (resolvedAction !== undefined) {
    if (typeof(resolvedAction) === 'function') {
      result = resolvedAction(...params)
    } else {
      result = resolvedAction;
    }
    if (data.data.saveResult === true) {
      if (data.data.saveKey) {
        const saveKey = `${prefix}-${data.data.saveKey}`;
        functionMap.set(saveKey, result);
      } else {
        console.log('Please provide a save key');
      }
      result = 'Complete';
    }
  }
  //Send a response with the proper key back to the iframe containing the result.  
  event.source.postMessage({
      key: data.key,
      value: result,
      origin: 'zowe',
    }, '*');

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
