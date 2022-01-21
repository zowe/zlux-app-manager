/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LaunchbarItem } from '../launchbar/shared/launchbar-item';
import { PluginLaunchbarItem } from '../launchbar/shared/launchbar-items/plugin-launchbar-item';
import { DesktopPluginDefinitionImpl } from '../../../plugin-manager/shared/desktop-plugin-definition';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { L10nTranslationService } from 'angular-l10n';
import { WindowManagerService } from '../shared/window-manager.service';
import { BaseLogger } from 'virtual-desktop-logger';

@Injectable()
export class PluginsDataService implements MVDHosting.LogoutActionInterface {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  public counter: number;
  public pinnedPlugins: LaunchbarItem[];
  private accessiblePlugins: LaunchbarItem[];
  private scope: string = "user";
  private resourcePath: string = "ui/launchbar/plugins";
  private fileName: string = "pinnedPlugins.json"
  private pluginManager: MVDHosting.PluginManagerInterface;
  private authenticationManager: MVDHosting.AuthenticationManagerInterface;

  constructor(
    private injector: Injector,
    private http: HttpClient,
    private translation: L10nTranslationService,
    private windowManager: WindowManagerService
  ) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.authenticationManager.registerPreLogoutAction(this);
    this.refreshPinnedPlugins;
    this.counter = 0;
  }

  onLogout(username: string): boolean {
      this.pinnedPlugins = [];
      return true;
  }

  public refreshPinnedPlugins(accessiblePlugins: LaunchbarItem[]): void {
    this.accessiblePlugins = accessiblePlugins;
    this.pinnedPlugins = [];
    this.getResource(this.scope, this.resourcePath, this.fileName)
      .subscribe(res =>{
        res.body.contents.plugins.forEach((p: string) => {
          let found = false;
          for (let i = 0; i < accessiblePlugins.length; i++) {
            if (accessiblePlugins[i].plugin.getIdentifier() == p) {
              this.pinnedPlugins.push(new PluginLaunchbarItem(accessiblePlugins[i].plugin, this.windowManager));
              found = true;
              break;
            }
          }
          if (!found) {
            this.logger.warn(`Pinned plugin not found=${p}`)
          }
        })
      })
    }

  public getResource(scope: string, resourcePath: string, fileName: string): Observable<HttpResponse<any>>{
    let uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(ZoweZLUX.pluginManager.getDesktopPlugin(), scope, resourcePath, fileName);
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get(uri, { headers: headers, observe: 'response' });
  }

  public saveResource(plugins: string[], scope: string, resourcePath: string, fileName: string): void{
    let uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(ZoweZLUX.pluginManager.getDesktopPlugin(), scope, resourcePath, fileName);
    let params = {"plugins": plugins};
    this.http.put(uri, params).subscribe((res) => {
      this.pinnedPlugins = this.getMatchingPlugins(this.accessiblePlugins, plugins);
    }, (err)=> {
      this.logger.warn("ZWED5179W", err); //this.logger.warn(`Could not update pinned plugins, err=${err}`);
    });
  }

  private getMatchingPlugins(items: LaunchbarItem[], plugins: string[]): LaunchbarItem[] {
    let list: LaunchbarItem[] = [];
    plugins.forEach((p: string) => {
      this.pluginManager.findPluginDefinition(p)
        .then(res => {
          if (res == null) {
            this.logger.warn("ZWED5180W", p) //this.logger.warn(`Bad Plugin Definition for plugin=${p}`)
          } else {
            for (let i = 0; i < items.length; i++) {
              if (items[i].plugin.getKey() == (res as DesktopPluginDefinitionImpl).getKey()) {
                list.push(items[i]);
                break;
              }
            }
          }
        })
    });
    return list;
  }

  public isPinnedPlugin(item: LaunchbarItem): boolean{
    const itemIdentifier: string = item.plugin.getBasePlugin().getIdentifier();
    let foundPlugin = this.pinnedPlugins.find(function(launchbarItem: LaunchbarItem): boolean {
      return launchbarItem.plugin.getBasePlugin().getIdentifier() == itemIdentifier;
    });
    if (foundPlugin != undefined) {
      return true;
    } else {
      return false;
    }
  }

  public saveToConfigServer(item: LaunchbarItem): void {
    this.getResource(this.scope, this.resourcePath, this.fileName)
      .subscribe(res=>{
        let plugins:string[];
        if (res.status === 204) {
          plugins = [];
        } else {
          plugins = res.body.contents.plugins;
        }
        let exists = false;
        let id = item.plugin.getBasePlugin().getIdentifier();
        for (let i = 0; i < plugins.length; i++) {
          if (plugins[i] == id) {
            exists = true;
            break;
          }
        }
        if (!exists) {
          plugins.push(id);
          this.saveResource(plugins, this.scope, this.resourcePath, this.fileName);
        }
      })
  }

  public removeFromConfigServer(item: LaunchbarItem): void {
    this.getResource(this.scope, this.resourcePath, this.fileName)
      .subscribe(res=>{
        let index = res.body.contents.plugins.indexOf(item.plugin.getBasePlugin().getIdentifier());
        let plugins = res.body.contents.plugins;
        if (index != -1) {
          plugins.splice(index, 1);
          this.saveResource(plugins, this.scope, this.resourcePath, this.fileName);
        }
      })
  }

  public pinContext(item: LaunchbarItem): ContextMenuItem {
    return {
      "text": this.isPinnedPlugin(item) ? this.translation.translate('UnpinFromTaskbar') : this.translation.translate('PinToTaskbar'),
      "action": () => this.isPinnedPlugin(item) ? this.removeFromConfigServer(item) : this.saveToConfigServer(item)
    };
  }

  public arrayMove(arr: string[], fromIndex: number, toIndex: number): void{
    if (toIndex > arr.length) {
      toIndex = arr.length;
    } else if(toIndex < 0) {
      toIndex = 0;
    }
    var element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
    this.saveResource(arr, this.scope, this.resourcePath, this.fileName);
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
