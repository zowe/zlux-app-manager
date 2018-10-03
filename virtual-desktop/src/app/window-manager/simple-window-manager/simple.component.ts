

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Injector, OnInit } from '@angular/core';
import { ApplicationManager } from "app/application-manager/application-manager.service";
import { PluginManager } from "app/plugin-manager/shared/plugin-manager";
import { DesktopPluginDefinitionImpl } from "app/plugin-manager/shared/desktop-plugin-definition";

@Component({
  selector: 'rs-com-root',
  templateUrl: './simple.component.html',
  styleUrls: ['./simple.component.css'],
})
export class SimpleComponent implements OnInit {
  viewportId: MVDHosting.ViewportId;
  private windowManager: MVDWindowManagement.WindowManagerServiceInterface;

  constructor(
    private applicationManager: ApplicationManager,
    private pluginManager: PluginManager,
    private injector: Injector,
  ) {
    this.windowManager = this.injector.get(MVDWindowManagement.Tokens.WindowManagerToken);
  }

  ngOnInit(): void {

    let requestedPluginID: string = (window as any)['GIZA_PLUGIN_TO_BE_LOADED'];

    if (!requestedPluginID) {
      // Default back to sample plugin:
      console.warn("GIZA_PLUGIN_TO_BE_LOADED not set, defaulting to sample plugin!");
      requestedPluginID = "com.rs.mvd.myplugin";
    }

    const pluginID: string = requestedPluginID;
    const pluginPromise: Promise<MVDHosting.DesktopPluginDefinition | null> = this.pluginManager.findPluginDefinition(pluginID);

    pluginPromise.then(plugin => {
      if (plugin) {
        const launchMetadata = {
          singleAppMode: true,
          arguments: this.parseUriArguments()
        };
        this.applicationManager.spawnApplication(plugin as DesktopPluginDefinitionImpl, launchMetadata);
        this.viewportId = this.windowManager.getViewportId(1);
      } else {
        console.error("plugin to be loaded not found: "+pluginID);
      }
    })
      .catch(x => console.log("plugin promise not returned"));
  }

  parseUriArguments(): any {
    // FIXME: Code duplication with bootstrap. Should be fixed by introducing
    //   of routing (MVD-1535)
    const result: { [id: string]: any } = {};

    const queryString: string = location.search.substr(1);
    queryString.split('&').forEach(function(part) {
      const pair = part.split('=').map(x => decodeURIComponent(x));
      result[pair[0]] = pair[1];
    });

    return result;
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

