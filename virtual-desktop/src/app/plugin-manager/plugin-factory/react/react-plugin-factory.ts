

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PluginFactory } from '../plugin-factory';
import { CompiledPlugin } from '../../shared/compiled-plugin';

import { ReactPluginComponent, ReactEntryHook } from './react-plugin.component';
import { BaseLogger } from 'virtual-desktop-logger';

interface MvdNativeReactPluginComponentDefinition {
  registerComponentFactories(): void;
}

@Injectable()
export class ReactPluginFactory extends PluginFactory {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private static getReactModuleURL(pluginDefinition: MVDHosting.DesktopPluginDefinition): string {
    let pluginDefBase = pluginDefinition.getBasePlugin();
    let pluginDefAny:any = (pluginDefBase as any);
    let entryPoint = 'main.js';
    if (pluginDefAny.getWebEntryPoint) {
      entryPoint = pluginDefAny.getWebEntryPoint() || 'main.js';
    }
    return ZoweZLUX.uriBroker.pluginResourceUri(pluginDefBase, entryPoint);
  }

  private static getReactComponentsURL(pluginDefinition: MVDHosting.DesktopPluginDefinition): string {
    return ZoweZLUX.uriBroker.pluginResourceUri(pluginDefinition.getBasePlugin(), 'components.js');
  }

  constructor(
  ) {
    super();
  }

  acceptableFrameworks(): string[] {
    return ['react'];
  }

  loadComponentFactories(pluginDefinition: MVDHosting.DesktopPluginDefinition): Promise<void> {
    const scriptUrl = ReactPluginFactory.getReactComponentsURL(pluginDefinition);

    return new Promise((resolve, reject) => {
      if (pluginDefinition.hasComponents()) {
        (window as any).require([scriptUrl],
          (components: MvdNativeReactPluginComponentDefinition) => {
            components.registerComponentFactories();
          },
          (failure: any) => {
            this.logger.warn("ZWED5173W", pluginDefinition.getIdentifier()); //this.logger.warn(`No component definition for plugin ${pluginDefinition.getIdentifier()}`);
            resolve();
          });
      } else {
        resolve();
      }
    });
  }

  loadPlugin(pluginDefinition: MVDHosting.DesktopPluginDefinition, instanceId: MVDHosting.InstanceId): Promise<CompiledPlugin> {
    const scriptUrl = ReactPluginFactory.getReactModuleURL(pluginDefinition);
    return new Promise((resolve, reject) => {
      (window as any).require([scriptUrl],
        (reactHook: any) => {
          @NgModule({
            imports: [CommonModule],
            declarations: [ReactPluginComponent],
            providers: [
              {
                provide: ReactEntryHook,
                useValue: reactHook
              }
            ]
          })
          class ReactPluginModule { }

          resolve(new CompiledPlugin(ReactPluginComponent, ReactPluginModule));
        },
        (failure: any) =>
          reject(failure)
      );
    });
  }
}


// /*
//   This program and the accompanying materials are
//   made available under the terms of the Eclipse Public License v2.0 which accompanies
//   this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
//   SPDX-License-Identifier: EPL-2.0
  
//   Copyright Contributors to the Zowe Project.
// */

