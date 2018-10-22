

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { NgModule } from '@angular/core';

import { PluginManager } from './shared/plugin-manager';
import { PluginLoader } from './shared/plugin-loader';
import { Angular2PluginFactory } from './plugin-factory/angular2/angular2-plugin-factory';
import { IFramePluginFactory } from './plugin-factory/iframe/iframe-plugin-factory';
import { ReactPluginFactory } from './plugin-factory/react/react-plugin-factory';
import { ReactPluginComponent } from './plugin-factory/react/react-plugin.component';

@NgModule({
  declarations: [
    ReactPluginComponent
  ],
  providers: [
    Angular2PluginFactory,
    IFramePluginFactory,
    ReactPluginFactory,
    PluginManager,
    PluginLoader,
    /* Expose plugin manager to external window managers */
    { provide: MVDHosting.Tokens.PluginManagerToken, useExisting: PluginManager }
  ]
})
export class PluginManagerModule {

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

