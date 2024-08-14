

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

/*
 * This is the entry point for bootstrapping the desktop Angular application.
 * To set up the desktop, this file must provide a public path for CSS
 * resources, load any external/global stylesheets and scripts, prepare the DOM
 * for the Angular application, and bootstrap the application. The core MVD
 * implementation exists at ZoweZLUX.
 */

import '@angular/compiler';
import '@angular/localize/init';
import { enableProdMode, Type } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { MvdComponent } from 'app/window-manager/mvd-window-manager/mvd.component';

import { MvdModuleFactory } from './app/mvd-module-factory';
import { SimpleWindowManagerModule } from './app/window-manager/simple-window-manager/simple-window-manager.module';
import { environment } from './environments/environment';
import { WindowManagerModule } from 'app/window-manager/mvd-window-manager/window-manager.module';
import { SimpleComponent } from 'app/window-manager/simple-window-manager/simple.component';
import { StartURLManager } from '../src/app/start-url-manager/start-url-manager.service';

/* Load globals */
// import 'jquery';
// Dropdown component in workflows-app requires bootstrap JS components and popper.js
// In Zowe v2 we remove the workflows-app
// TODO: consider to remove the two imports below
import 'popper.js';
import 'bootstrap';
import 'zone.js';

if (environment.production) {
  enableProdMode();
}

let mainModule: Type<any>;

/* Check which window manager to use from URL */
const app2appArray = StartURLManager.getApp2AppArgsArray();
for (let index = 0; index < app2appArray.length; index++) {
  const key = app2appArray[index][0];
  const value = app2appArray[index][1];

  if (key == "windowManager") {
    if (value.toUpperCase() == "MVD") {
      mainModule = MvdModuleFactory.generateModule(WindowManagerModule, MvdComponent);
    } else {
      mainModule = MvdModuleFactory.generateModule(SimpleWindowManagerModule, SimpleComponent);
    }
    break;
  }
}

/* Load second stage with requirejs */
const script = document.createElement('script');

script.setAttribute('src', ZoweZLUX.uriBroker.pluginResourceUri(ZoweZLUX.pluginManager.getDesktopPlugin(), 'require.js'));
script.onload = () => {
  if (typeof (window as any).requirejs !== 'undefined') {
    (window as any).requirejs.config({
      waitSeconds: 0
    });
    // Any additional RequireJS configuration or loading should go here
    console.log('RequireJS loaded and configured successfully.');
    const libs: { [index: string]: { library: any } } = {
      '@angular/core': require('@angular/core'),
      '@angular/common': require('@angular/common'),
      '@angular/common/http': require('@angular/common/http'),
      '@angular/platform-browser': require('@angular/platform-browser'),
      '@angular/platform-browser/animations': require('@angular/platform-browser/animations'),
      '@angular/platform-browser-dynamic': require('@angular/platform-browser-dynamic'),
      '@angular/cdk/portal': require('@angular/cdk/portal'),
      '@angular/material/snack-bar': require('@angular/material/snack-bar'),
      '@angular/material/dialog': require('@angular/material/dialog'),
      '@angular/material/icon': require('@angular/material/icon'),
      '@angular/material/autocomplete': require('@angular/material/autocomplete'),
      '@angular/material/button': require('@angular/material/button'),
      '@angular/material/button-toggle': require('@angular/material/button-toggle'),
      '@angular/material/checkbox': require('@angular/material/checkbox'),
      '@angular/material/form-field': require('@angular/material/form-field'),
      '@angular/material/input': require('@angular/material/input'),
      '@angular/material/list': require('@angular/material/list'),
      '@angular/material/slide-toggle': require('@angular/material/slide-toggle'),
      '@angular/material/table': require('@angular/material/table'),
      '@angular/material/tooltip': require('@angular/material/tooltip'),
      '@angular/material/expansion': require('@angular/material/expansion'),
      '@angular/material/select': require('@angular/material/select'),
      '@angular/material': require('@angular/material'),
      '@angular/forms': require('@angular/forms'),
      '@angular/router': require('@angular/router'),
      '@angular/animations': require('@angular/animations'),
      '@angular/cdk': require('@angular/cdk'),
      'angular-l10n': require('angular-l10n'),
      'rxjs': require('rxjs'),
      'rxjs/operators': require('rxjs/operators')
    };

    /* Expose modules to requirejs */
    for (const library in libs) {
      if (libs[library]) {
        (window as any).define(library, libs[library]);
      } else {
        console.warn(`Missing library ${library}`);
      }
    }
  } else {
    console.error('RequireJS did not load correctly.');
  }
};
script.onerror = () => {
  console.error('Failed to load RequireJS script.');
};
if (document.head) {
  document.head.appendChild(script);
}

function performBootstrap(): void {
  MvdModuleFactory.getTranslationProviders()
    .then(providers => platformBrowserDynamic().bootstrapModule(mainModule
      || MvdModuleFactory.generateModule(WindowManagerModule, MvdComponent), { providers: providers }));
}

// set baseurl 
const baseUrl = document.createElement('base');
baseUrl.setAttribute("href", ZoweZLUX?.uriBroker.desktopRootUri());

if (document.head) {
  document.head.appendChild(baseUrl);
}

const element = document.createElement('rs-com-root');
document.body.appendChild(element);
performBootstrap();

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

