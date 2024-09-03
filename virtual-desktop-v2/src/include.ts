

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

/*
 * This file loads external scripts and stylesheets needed for the desktop.
 * script-loader loads scripts into the global context (no modules, namespacing,
 * etc.). It should *only* be used for legacy external resources that do not
 * have a module-based distribution.
 *
 * style-loader loads the CSS into the page via a <style> tag. Ideally, the non-
 * external, global styles will be eliminated in favor of component-level styles
 * wherever possible. However, since this is a desktop plugin, we must have at
 * least one global style in order to create the desktop itself.
 */

import './styles.css';


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

