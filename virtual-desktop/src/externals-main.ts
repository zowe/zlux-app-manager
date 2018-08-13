

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

/* Load globals */
import 'script-loader!jquery';
import 'script-loader!bootstrap';

/* Load second stage with requirejs */
const script = document.createElement('script');
script.setAttribute('data-main', RocketMVD.uriBroker.pluginResourceUri(RocketMVD.PluginManager.getDesktopPlugin(), 'externals.js'));
script.setAttribute('src', RocketMVD.uriBroker.pluginResourceUri(RocketMVD.PluginManager.getDesktopPlugin(), 'require.js'));
document.head.appendChild(script);


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

