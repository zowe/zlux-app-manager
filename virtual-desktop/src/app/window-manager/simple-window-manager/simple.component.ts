

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
import { BaseLogger } from 'virtual-desktop-logger';

@Component({
  selector: 'rs-com-root',
  templateUrl: './simple.component.html',
  styleUrls: ['./simple.component.css'],
})
export class SimpleComponent implements OnInit {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  viewportId: MVDHosting.ViewportId;
  private windowManager: MVDWindowManagement.WindowManagerServiceInterface;
  public showLogin:boolean = (window as any).ZOWE_SWM_SHOW_LOGIN == 1 ? true : false;
  public error:string='';

  constructor(
    private applicationManager: ApplicationManager,
    private pluginManager: PluginManager,
    private injector: Injector,
  ) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.windowManager = this.injector.get(MVDWindowManagement.Tokens.WindowManagerToken);
  }

  ngOnInit(): void {

    let requestedPluginID: string = (window as any)['GIZA_PLUGIN_TO_BE_LOADED'];

    if (!requestedPluginID) {
      let message = "Plugin ID required. Use query parameter ?pluginId";
      this.logger.severe(message);
      this.error = message;
      return;
    }

    const pluginID: string = requestedPluginID;
    const pluginPromise: Promise<MVDHosting.DesktopPluginDefinition | null> = this.pluginManager.findPluginDefinition(pluginID);

    pluginPromise.then(plugin => {
      if (plugin) {
        let pluginImpl = (plugin as DesktopPluginDefinitionImpl);
        document.title = pluginImpl.label ? pluginImpl.label : "Zowe App"
        let imageUrl = pluginImpl.image;
        if (imageUrl) {
          let link: any = document.querySelector("link[rel*='icon']") || document.createElement('link');
          link.type = 'image/x-icon';
          link.rel = 'shortcut icon';
          link.href = imageUrl;
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        const launchMetadata = {
          singleAppMode: true,
          arguments: this.parseUriArguments()
        };
        this.applicationManager.spawnApplication(plugin as DesktopPluginDefinitionImpl, launchMetadata);
        this.viewportId = this.windowManager.getViewportId(1);
      } else {
        let message = "Cannot find plugin with ID="+pluginID;
        this.logger.severe(message);
        this.error = message;
      }
    }).catch((x) => {
      let message = "Plugin promise not returned, cannot continue";
      this.logger.severe(message);
      this.error = message;
      return;
    });
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

