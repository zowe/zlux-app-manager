

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector, NgModuleRef, ValueProvider } from '@angular/core';

// import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';

import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { LOAD_FAILURE_ERRORS } from '../load-failure/failure-injection-tokens';
import { Viewport } from '../viewport-manager/viewport';

const ComponentLoggerContainer:Map<string,ZLUX.ComponentLogger> = new Map<string,ZLUX.ComponentLogger>();

@Injectable()
export class InjectionManager {
  constructor(
    private injector: Injector
  ) {

  }

  // Angular2 injectors are built into a tree-like structure
  // module injectors are a tree
  // injector above in constructor is injector of the AppManager module
  // generateModuleInjector make root injector augmented with addition providers

  generateModuleInjector(pluginDefinition: MVDHosting.DesktopPluginDefinition, launchMetadata: any): Injector {
    let identifier = pluginDefinition.getIdentifier();
    
    let logger:ZLUX.ComponentLogger|undefined = ComponentLoggerContainer.get(identifier);
    if (!logger) {
      logger = ZoweZLUX.logger.makeComponentLogger(identifier);
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

