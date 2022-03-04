

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

/* Load globals */
import 'jquery';
// Dropdown component in workflows-app requires bootstrap JS components and popper.js
// In Zowe v2 we remove the workflows-app
// TODO: consider to remove the two imports below
import 'popper.js';
import 'bootstrap';

/* Load second stage with requirejs */
const script = document.createElement('script');
script.setAttribute('data-main', ZoweZLUX.uriBroker.pluginResourceUri(ZoweZLUX.pluginManager.getDesktopPlugin(), 'externals.js'));
script.setAttribute('src', ZoweZLUX.uriBroker.pluginResourceUri(ZoweZLUX.pluginManager.getDesktopPlugin(), 'require.js'));

if (document.head) {
  document.head.appendChild(script);
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

