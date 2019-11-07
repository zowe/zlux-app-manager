
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { BootstrapManager } from './bootstrap/bootstrap-manager'
export { BootstrapManager } from './bootstrap/bootstrap-manager'

// FIXME: Code duplication with single-app window manager.
//   Should be fixed by introducing of routing (MVD-1535)
function parseQuery() {
  const queryString: string = location.search.substr(1);
  const queryObject: { [id: string]: string } = {};
  queryString.split('&').forEach(function(part) {
    const pair = part.split('=').map(x => decodeURIComponent(x));
    queryObject[pair[0]] = pair[1];
  });
  return queryObject;
}
const query = parseQuery();
if (typeof query.pluginId === 'string') {
  console.log(`simple container requested with pluginId ${query.pluginId}`);
  (window as any)['GIZA_SIMPLE_CONTAINER_REQUESTED'] = true;
  (window as any)['GIZA_PLUGIN_TO_BE_LOADED'] = query.pluginId;
  (window as any)['ZOWE_SWM_SHOW_LOGIN'] = query.showLogin;
  (window as any)['GIZA_ENVIRONMENT'] = 'MVD';
}

try {
  const simpleContainerRequested = (window as any)['GIZA_SIMPLE_CONTAINER_REQUESTED'];
  const uriBroker = (window as any)['GIZA_ENVIRONMENT'];

  if (!simpleContainerRequested || uriBroker.toUpperCase() === 'MVD') {
    BootstrapManager.bootstrapDesktopAndInject();
  }
} catch (error) {
  console.error("Unable to bootstrap desktop!!");
  console.error(error);
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

