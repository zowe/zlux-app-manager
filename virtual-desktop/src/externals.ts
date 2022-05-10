

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

/*
  Imperfect solution to an imperfect world. See https://github.com/requirejs/requirejs/issues/787 and https://requirejs.org/docs/api.html#config-waitSeconds
*/
(window as any).requirejs.config({
  waitSeconds: 0
});

/* These will be packaged into a single bundle by the webpack bundling system.
 * We then expose them to our module loader (requirejs) manually and use that
 * to load the desktop and external plugins. These requires use webpack. */

const libs: { [index: string]: {library: any} } = {
  '@angular/core': require('@angular/core'),
  '@angular/common': require('@angular/common'),
  '@angular/common/http': require('@angular/common/http'),
  '@angular/http': require('@angular/http'),
  '@angular/platform-browser': require('@angular/platform-browser'),
  '@angular/platform-browser/animations': require('@angular/platform-browser/animations'),
  '@angular/platform-browser-dynamic': require('@angular/platform-browser-dynamic'),
  '@angular/cdk/portal': require('@angular/cdk/portal'),
  '@angular/material': require('@angular/material'),
  '@angular/forms': require('@angular/forms'),
  '@angular/router': require('@angular/router'),
  '@angular/animations': require('@angular/animations'),
  'angular-l10n': require('angular-l10n'),
  'rxjs/Rx': require('rxjs/Rx'),
  'rxjs': require('rxjs'),
  'rxjs/operators': require('rxjs/operators'),
};

/* Expose modules to requirejs */
for (const library in libs) {
  if (libs[library]) {
    (window as any).define(library, libs[library]);
  } else {
    console.warn(`Missing library ${library}`);
  }
}

/* Perform bootstrap using requirejs */
(window as any).requirejs([
  ZoweZLUX.uriBroker.pluginResourceUri(ZoweZLUX.pluginManager.getDesktopPlugin(), 'desktop.js')
], (desktop: any) => {
  /* Prepare the DOM for boostrapping */
  const element = document.createElement('rs-com-root');
  document.body.appendChild(element);

  desktop.performBootstrap();
});



/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

