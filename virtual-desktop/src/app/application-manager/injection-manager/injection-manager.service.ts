

/*
This program and the accompanying materials are
made available under the terms of the Eclipse Public License v2.0 which accompanies
this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

SPDX-License-Identifier: EPL-2.0

Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector, NgModuleRef, ValueProvider } from '@angular/core';
import { L10nConfigService } from './../../i18n/l10n-config.service';

// import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';

import { Angular2InjectionTokens, Angular2L10nConfig } from 'pluginlib/inject-resources';
import { LOAD_FAILURE_ERRORS } from '../load-failure/failure-injection-tokens';
import { Viewport } from '../viewport-manager/viewport';

const ComponentLoggerContainer:Map<string,ZLUX.ComponentLogger> = new Map<string,ZLUX.ComponentLogger>();

@Injectable()
export class InjectionManager {
  constructor(
    private injector: Injector,
    private l10nConfigService: L10nConfigService,
  ) {

  }

  // Angular2 injectors are built into a tree-like structure
  // module injectors are a tree
  // injector above in constructor is injector of the AppManager module
  // generateModuleInjector make root injector augmented with addition providers

  generateModuleInjector(pluginDefinition: MVDHosting.DesktopPluginDefinition, launchMetadata: any, messages?: any): Injector {
    let identifier = pluginDefinition.getIdentifier();
        
    const l10nPluginConfig: Angular2L10nConfig = {
      defaultLocale: this.l10nConfigService.getDefaultLocale(),
      providers: this.l10nConfigService.getTranslationProviders(pluginDefinition.getBasePlugin())
    };

    let logger:ZLUX.ComponentLogger|undefined = ComponentLoggerContainer.get(identifier);
    if (!logger) {
      logger = ZoweZLUX.logger.makeComponentLogger(identifier, messages);
      ComponentLoggerContainer.set(identifier,logger);
    }
    
    return Injector.create([
      {
        provide: Angular2InjectionTokens.LOGGER,
        useValue: logger
      },
      {
        provide: Angular2InjectionTokens.PLUGIN_DEFINITION,
        useValue: pluginDefinition
      },
      {
        provide: Angular2InjectionTokens.LAUNCH_METADATA,
        useValue: launchMetadata
      },
      {
        provide: Angular2InjectionTokens.L10N_CONFIG,
        useValue: l10nPluginConfig
      }
    ], this.injector.get(NgModuleRef).injector);  // gets root injector of virtualDesktop tree
  }

  generateComponentInjector(viewport: Viewport, parent: Injector): Injector {
    var mappings: ValueProvider[] = [];
    viewport.providers.forEach((value, provide) => {
      mappings.push({
        provide: provide,
        useValue: value
      });
    });
    return Injector.create(mappings, parent);
  }

  generateFailurePluginInjector(errors: any[]): Injector {
    const errorProvider: ValueProvider = {
      provide: LOAD_FAILURE_ERRORS,
      useValue: errors
    };

    return Injector.create([errorProvider], this.injector);
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

