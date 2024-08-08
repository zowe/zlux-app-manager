

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';

import { PluginFactory } from '../plugin-factory';
import { CompiledPlugin, CompiledPluginCustom } from '../../shared/compiled-plugin';

import { TranslationLoaderService } from '../../../i18n/translation-loader.service';
import { BaseLogger } from 'virtual-desktop-logger';

interface MvdNativeAngularPlugin {
  pluginModule: any;
  pluginComponent: any;
}

@Injectable()
export class Angular2PluginFactory extends PluginFactory {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private static getAngularModuleURL(pluginDefinition: MVDHosting.DesktopPluginDefinition): string {
    return ZoweZLUX.uriBroker.pluginResourceUri(pluginDefinition.getBasePlugin(), 'main.js');
  }

  constructor(
    // private compilerFactory: CompilerFactory,
    // private compiler: Compiler,
    private translationLoaderService: TranslationLoaderService
  ) {
    super();
  }

  acceptableFrameworks(): string[] {
    return ['angular2', 'angular'];
  }

  loadPlugin(pluginDefinition: MVDHosting.DesktopPluginDefinition, instanceId: MVDHosting.InstanceId): Promise<CompiledPlugin | CompiledPluginCustom> {
    const scriptUrl = Angular2PluginFactory.getAngularModuleURL(pluginDefinition);

    this.logger.info(`ZWED5052I`, pluginDefinition.getIdentifier(), scriptUrl); //this.logger.info(`Loading Angular Plugin ID=${pluginDefinition.getIdentifier()}, URL=${scriptUrl}`);

    return new Promise((resolve, reject) => {
      (window as any).require([scriptUrl],
        (plugin: MvdNativeAngularPlugin) => {
          this.translationLoaderService.getTranslationProviders(pluginDefinition.getBasePlugin()).then(providers => {
            resolve(new CompiledPluginCustom(plugin.pluginComponent, plugin.pluginModule, providers));
          });
        });
    });
  }
}

/*
 This program and the accompanying materials are
 made available under the terms of the Eclipse Public License v2.0 which accompanies
 this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

 SPDX-License-Identifier: EPL-2.0

 Copyright Contributors to the Zowe Project.
*/

