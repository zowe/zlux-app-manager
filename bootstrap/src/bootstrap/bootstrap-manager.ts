

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Plugin } from 'zlux-base/plugin-manager/plugin'
import { PluginManager } from 'zlux-base/plugin-manager/plugin-manager'
import { ZoweZLUXResources } from './rocket-mvd-resources'
import { DSMResources } from './dsm-resources'


declare var window: { ZoweZLUX: typeof ZoweZLUXResources };

export class BootstrapManager {
  private static bootstrapPerformed = false;

  private static bootstrapGlobalResources(simpleContainerRequested: boolean) {
    const uriBroker = (window as any)['GIZA_ENVIRONMENT'];
    console.log("bootstrapGlobalResources simpleContainerRequested flag value: ", simpleContainerRequested);
    console.log("bootstrapGlobalResources GIZA_ENVIRONMENT value: ", uriBroker);
    if (simpleContainerRequested && uriBroker.toUpperCase() === 'DSM') {
      window.ZoweZLUX = DSMResources;
    } else {
      window.ZoweZLUX = ZoweZLUXResources;
    }
  }

  private static bootstrapDesktopPlugin(desktop: ZLUX.Plugin, injectionCallback: (plugin: ZLUX.Plugin) => Promise<void>) {
    if (BootstrapManager.bootstrapPerformed) {
      throw new Error("The desktop has already been bootstrapped");
    }
    if (desktop.getType() != ZLUX.PluginType.Desktop) {
      throw new Error("Cannot bootstrap a non-desktop plugin as a desktop");
    }

    PluginManager.setDesktopPlugin(desktop as Plugin);

    injectionCallback(desktop).then(() => {
      console.log(`${desktop.getIdentifier()} has been bootstrapped successfully`);
    }).catch(() => {
      throw new Error("Unable to load main script of desktop");
    });
  }

  static bootstrapDesktopAndInject() {
    BootstrapManager.bootstrapDesktop((plugin) => {
      return PluginManager.includeScript(window.ZoweZLUX.uriBroker.pluginResourceUri(plugin, "main.js"));
    });
  }

  static bootstrapDesktop(injectionCallback: (plugin: ZLUX.Plugin) => Promise<void>) {
    const simpleContainerRequested = (window as any)['GIZA_SIMPLE_CONTAINER_REQUESTED'];

    BootstrapManager.bootstrapGlobalResources(simpleContainerRequested);

    PluginManager.loadPlugins(ZLUX.PluginType.Desktop).then(desktops => {
      console.log(`${desktops.length} desktops available`);
      console.log('desktops: ', desktops);

      if (desktops.length == 0) {
        console.error("No desktops available to bootstrap.");
      } else {
        BootstrapManager.bootstrapDesktopPlugin(desktops[0], injectionCallback);
      }
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

