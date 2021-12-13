

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

/* Load globals */
import 'script-loader!jquery';
/*
 Action dropdown in zlux-workflow Workflow tab fails due to lack of Popper.js
 The following seemed to be the best way to follow the advice in the top answer to
 https://stackoverflow.com/questions/45680644/angular-4-bootstrap-dropdown-require-popper-js
 NOTES
 1. simple 'script-loader!popper.js loads, for some reason, ../node_modules/popper.js/dist/esm/popper.js
    This results in:
   main.js:1 [Script Loader] SyntaxError: Unexpected token export
    at eval (<anonymous>)
    at t.exports (main.js:1)
    at Object../node_modules/script-loader/index.js!./node_modules/popper.js/dist/esm/popper.js (main.js:1)
 2. using exports-loader!popper.js to be compatible with esm/popper.js is not compatible with bootstrap: you still get
   VM4398:1553 Uncaught TypeError: Bootstrap dropdown require Popper.js (https://popper.js.org)
*/
import 'script-loader!../node_modules/@popperjs/core/dist/umd/popper.js';import 'script-loader!bootstrap';

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

