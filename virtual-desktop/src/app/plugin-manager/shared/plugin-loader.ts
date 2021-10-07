

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';

import { CompiledPlugin } from './compiled-plugin';
// import { DesktopPluginDefinition } from './desktop-plugin-definition';
import { PluginFactory } from '../plugin-factory/plugin-factory';
import { Angular2PluginFactory } from '../plugin-factory/angular2/angular2-plugin-factory';
import { IFramePluginFactory } from '../plugin-factory/iframe/iframe-plugin-factory';
import { ReactPluginFactory } from '../plugin-factory/react/react-plugin-factory';
import { BaseLogger } from 'virtual-desktop-logger';

@Injectable()
export class PluginLoader {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private frameworkMap: Map<string, PluginFactory[]>;

  constructor(
    angular2: Angular2PluginFactory,
    iframe: IFramePluginFactory,
    react: ReactPluginFactory
  ) {
    this.frameworkMap = new Map<string, PluginFactory[]>();
    /* This can be moved to a more substantial registration system later on */
    this.registerPluginFactory(angular2);
    this.registerPluginFactory(iframe);
    this.registerPluginFactory(react);
  }

  private registerPluginFactory(pluginFactory: PluginFactory): void {
    pluginFactory.acceptableFrameworks().forEach(framework => {
      if (!this.frameworkMap.has(framework)) {
        this.frameworkMap.set(framework, []);
      }

      this.frameworkMap.get(framework)!.push(pluginFactory);
    });
  }

  loadPlugin(pluginDefinition: MVDHosting.DesktopPluginDefinition, instanceId: MVDHosting.InstanceId): Promise<CompiledPlugin | null> {
    const candidateFactories = this.frameworkMap.get(pluginDefinition.getFramework()) || [];
    if (pluginDefinition.getFramework() === 'unsupported') {
      return new Promise((resolve, reject) => {
        this.logger.warn("ZWED5175W", pluginDefinition.getIdentifier()); //this.logger.warn(`${pluginDefinition.getIdentifier()} does not use supported framework`);
        resolve(null);
      });
    } else if (pluginDefinition.getFramework() === 'n/a') {
      return new Promise((resolve, reject) => {
        resolve(null);
      });
    }

    /* Attempt all registered factories for the given framework */
    return candidateFactories.reduce(
      (promise, factory) => promise.catch((errors: any[]) =>
        factory.loadPlugin(pluginDefinition, instanceId).catch((error) => Promise.reject(errors.concat([error])))
      ),
      Promise.reject([new Error(`ZWED5152E - All plugin factories for framework type "${pluginDefinition.getFramework()}" failed`)])
    );
  }

  loadPluginComponentFactories(pluginDefinition: MVDHosting.DesktopPluginDefinition): Promise<void> {
    const candidateFactories = this.frameworkMap.get(pluginDefinition.getFramework()) || [];

    if (pluginDefinition.getFramework() === 'unsupported') {
      return new Promise((resolve, reject) => {
        this.logger.warn("ZWED5176W", pluginDefinition.getIdentifier()); //this.logger.warn(`${pluginDefinition.getIdentifier()} does not use supported framework`);
        resolve();
      });
    } else if (pluginDefinition.getFramework() === 'n/a') {
      return new Promise((resolve, reject) => {
        resolve();
      });
    }

    /* Attempt all registered factories for the given framework */
    return candidateFactories.reduce(
      (promise, factory) => promise.catch((errors: any[]) =>
        factory.loadComponentFactories(pluginDefinition).catch((error) => Promise.reject(errors.concat([error])))
      ),
      Promise.reject([new Error(`ZWED5153E - All plugin factories for framework type "${pluginDefinition.getFramework()}" failed`)])
    );
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

