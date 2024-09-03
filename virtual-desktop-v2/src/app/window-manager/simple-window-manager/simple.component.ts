

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
import { SimpleWindowManagerService } from "./simple-window-manager.service";
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { BaseLogger } from 'virtual-desktop-logger';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'rs-com-root',
  templateUrl: './simple.component.html',
  styleUrls: ['./simple.component.css'],
})
export class SimpleComponent implements OnInit {
  contextMenuDef: {xPos: number, yPos: number, items: ContextMenuItem[]} | null;
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  viewportId: MVDHosting.ViewportId;
  private windowManager: SimpleWindowManagerService;
  public showLogin:boolean = window.ZOWE_SWM_SHOW_LOGIN == true ? true : false;
  public error:string='';

  constructor(
    private applicationManager: ApplicationManager,
    private pluginManager: PluginManager,
    private injector: Injector,
    private HTTP:HttpClient
  ) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.windowManager = this.injector.get(MVDWindowManagement.Tokens.WindowManagerToken);
  }

  closeContextMenu(): void {
    this.contextMenuDef = null;
  }

  ngOnInit(): void {
    this.windowManager.contextMenuRequested.subscribe(menuDef => {
      this.contextMenuDef = menuDef;
    });
    
    let requestedPluginID: string | undefined = window['GIZA_PLUGIN_TO_BE_LOADED'];

    if (!requestedPluginID) {
      let message = "Plugin ID required. Use query parameter ?pluginId";
      this.logger.severe("ZWED5143E"); //this.logger.severe(message);
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
        const launchMetadata : {[key: string]: any}= {
          singleAppMode: true,
          arguments: this.parseUriArguments()
        };
        this.HTTP.get<any>(ZoweZLUX.uriBroker.pluginConfigUri(ZoweZLUX.pluginManager.getDesktopPlugin(),'pluginData/singleApp',plugin.getIdentifier())).subscribe(res => {
          if(res){
            launchMetadata["data"] = {"appData" : res.contents.appData,"type":"setAppRequest","actionType":"Launch","targetMode":"PluginCreate"} 
          }
          this.applicationManager.spawnApplication(plugin as DesktopPluginDefinitionImpl, launchMetadata);
          this.viewportId = this.windowManager.getViewportId(1);
        });
      } else {
        let message = "Cannot find plugin with ID="+pluginID;
        this.logger.severe("ZWED5144E", pluginID); //this.logger.severe(message);
        this.error = message;
      }
    }).catch((x) => {
      let message = "Plugin promise not returned, cannot continue";
      this.logger.severe("ZWED5145E"); //this.logger.severe(message);
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

