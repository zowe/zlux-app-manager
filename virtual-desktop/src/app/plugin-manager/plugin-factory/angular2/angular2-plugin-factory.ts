

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { createComponent, Injectable } from '@angular/core';

import { PluginFactory } from '../plugin-factory';
import { CompiledPlugin } from '../../shared/compiled-plugin';
import { ApplicationRef, Injector } from '@angular/core';
import { from, Observable } from 'rxjs';

import { ComponentFactory } from 'zlux-base/registry/registry';
import { TranslationLoaderService } from '../../../i18n/translation-loader.service';
import { BaseLogger } from 'virtual-desktop-logger';

interface MvdNativeAngularPlugin {
  pluginModule: any;
  pluginComponent: any;
}

interface MvdNativeAngularComponent {
  componentNgModule: any;
  componentNgComponent: any;
}

interface AngularComponentFactoryDefinition {
  componentScriptUrl: string;
  componentClass: ZLUX.ComponentClass;
  capabilities: ZLUX.Capability[];
}

interface MvdNativeAngularPluginComponentDefinition {
  getComponentFactoryDefinitions(pluginDefinition: MVDHosting.DesktopPluginDefinition): AngularComponentFactoryDefinition[];
}

class SimpleAngularComponentFactory extends ComponentFactory {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  constructor(
    // private compiler: Compiler,
    private applicationRef: ApplicationRef,
    private injector: Injector,
    private componentModulePath: string,
    componentClass: ZLUX.ComponentClass,
    capabilities: ZLUX.Capability[]
  ) {
    super(componentClass, capabilities);
  }

  instantiateIntoDOM(target: any): Observable<any> {
    const promise: Promise<any> = new Promise((resolve, reject) => {
      (window as any).require([this.componentModulePath],
        (fullPlugin: MvdNativeAngularComponent) => {
          this.logger.debug("ZWED5314I", fullPlugin); //this.logger.debug(`Instantiating into DOM=`,fullPlugin);
          const componentRef = createComponent<any>(fullPlugin.componentNgComponent, {
            environmentInjector: this.applicationRef.injector,
            elementInjector: this.injector
          });
          resolve(componentRef.instance as any);
        },
        (failure: any) => {
          reject();
        });
    });

    return from(promise);
  }
}

@Injectable()
export class Angular2PluginFactory extends PluginFactory {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private static getAngularModuleURL(pluginDefinition: MVDHosting.DesktopPluginDefinition): string {
    let pluginDefBase = pluginDefinition.getBasePlugin();
    let pluginDefAny:any = (pluginDefBase as any);
    let entryPoint = 'main.js';
    if (pluginDefAny.getWebEntrypoint) {
      entryPoint = pluginDefAny.getWebEntrypoint() || 'main.js';
    }
    return ZoweZLUX.uriBroker.pluginResourceUri(pluginDefBase, entryPoint);
  }

  private static getAngularComponentsURL(pluginDefinition: MVDHosting.DesktopPluginDefinition): string {
    return ZoweZLUX.uriBroker.pluginResourceUri(pluginDefinition.getBasePlugin(), 'components.js');
  }

  constructor(
    private applicationRef: ApplicationRef,
    private injector: Injector,
    private translationLoaderService: TranslationLoaderService
  ) {
    super();
  }

  acceptableFrameworks(): string[] {
    return ['angular2', 'angular'];
  }

  loadComponentFactories(pluginDefinition: MVDHosting.DesktopPluginDefinition): Promise<void> {
    const scriptUrl = Angular2PluginFactory.getAngularComponentsURL(pluginDefinition);

    return new Promise((resolve, reject) => {
      if (pluginDefinition.hasComponents()) {
        (window as any).require([scriptUrl],
          (components: MvdNativeAngularPluginComponentDefinition) => {
            const factoryDefs = components.getComponentFactoryDefinitions(pluginDefinition);
            factoryDefs.forEach((factory: AngularComponentFactoryDefinition) => {
              const componentFactory = new SimpleAngularComponentFactory(this.applicationRef, this.injector,
                factory.componentScriptUrl, factory.componentClass, factory.capabilities);

              this.logger.info(`ZWED5051I`, pluginDefinition.getIdentifier()); //this.logger.info(`Registering component factory for plugin=${pluginDefinition.getIdentifier()}:`);
              this.logger.debug("ZWED5306I", componentFactory); //this.logger.debug(componentFactory);

              ZoweZLUX.registry.registerComponentFactory(componentFactory);

              resolve();
            });
          },
          (failure: any) => {
            this.logger.warn("ZWED5164W", pluginDefinition.getIdentifier()); //this.logger.warn(`No component definition for plugin ${pluginDefinition.getIdentifier()}`);
            resolve();
          });
      } else {
        resolve();
      }
    });
  }

  loadPlugin(pluginDefinition: MVDHosting.DesktopPluginDefinition, instanceId: MVDHosting.InstanceId): Promise<CompiledPlugin> {
    this.loadComponentFactories(pluginDefinition);
    const scriptUrl = Angular2PluginFactory.getAngularModuleURL(pluginDefinition);

    this.logger.info(`ZWED5052I`, pluginDefinition.getIdentifier(), scriptUrl); //this.logger.info(`Loading Angular Plugin ID=${pluginDefinition.getIdentifier()}, URL=${scriptUrl}`);

    return new Promise((resolve, reject) => {
      (window as any).require([scriptUrl],
        (plugin: MvdNativeAngularPlugin) => {
          this.translationLoaderService.getTranslationProviders(pluginDefinition.getBasePlugin()).then(providers => {
            resolve(new CompiledPlugin(plugin.pluginComponent, plugin.pluginModule, providers));
          });
        },
        (failure: any) => reject(failure)
      );
    });
  }
}

/*
 This program and the accompanying materials are
 made available under the terms of the Eclipse Public License v2.0 which accompanies
 this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

 SPDX-License-Identifier: EPL-2.0
 SPDX-License-Identifier: EPL-2.0

 Copyright Contributors to the Zowe Project.
 Copyright Contributors to the Zowe Project.
*/

