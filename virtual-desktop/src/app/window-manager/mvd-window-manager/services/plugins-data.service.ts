/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Inject } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import { LaunchbarItem } from '../launchbar/shared/launchbar-item';
import { PluginLaunchbarItem } from '../launchbar/shared/launchbar-items/plugin-launchbar-item';
import { DesktopPluginDefinitionImpl } from '../../../plugin-manager/shared/desktop-plugin-definition';
import { ContextMenuItem } from 'pluginlib/inject-resources';

@Injectable()
export class PluginsDataService {
    public counter: number;
    public pinnedPlugins: LaunchbarItem[];
    private scope: string = "user";
    private resourcePath: string = "ui/launchbar/plugins";
    private fileName: string = "pinnedPlugins.json" 

    constructor(
        @Inject(MVDHosting.Tokens.PluginManagerToken) public pluginManager: MVDHosting.PluginManagerInterface,
        private http: Http,
    ) { 
        this.refreshPinnedPlugins;
        this.counter = 0;
    }

    public refreshPinnedPlugins(): void {
      this.pinnedPlugins = [];
      this.getResource("user", "ui/launchbar/plugins" , "pinnedPlugins.json")
      .subscribe(res =>{
        res.json().contents.plugins.forEach((p: string) => {
          this.pluginManager.findPluginDefinition(p)
          .then(res => {
            if (res == null) {
              console.log("Bad Plugin Definition")
            } else { 
              this.pinnedPlugins.push(new PluginLaunchbarItem(res as DesktopPluginDefinitionImpl));
            }
          })
        })
      })
    }

    public getResource(scope: string, resourcePath: string, fileName: string): Observable<any>{
        let uri = RocketMVD.uriBroker.pluginConfigForScopeUri(RocketMVD.PluginManager.getDesktopPlugin(), scope, resourcePath, fileName);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.get(uri, options);
    
      }

    public saveResource(plugins: string[], scope: string, resourcePath: string, fileName: string): Observable<any>{
        let uri = RocketMVD.uriBroker.pluginConfigForScopeUri(RocketMVD.PluginManager.getDesktopPlugin(), scope, resourcePath, fileName);
        let params = {"plugins": plugins};
        return this.http.put(uri, params);
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
            plugins = res.json().contents.plugins;
          }
          plugins.push(item.plugin.getBasePlugin().getIdentifier());
          this.saveResource(plugins, this.scope, this.resourcePath, this.fileName)
            .subscribe(resp=> {
              this.refreshPinnedPlugins();
            })
        })
    }
  
    public removeFromConfigServer(item: LaunchbarItem): void {
      this.getResource(this.scope, this.resourcePath, this.fileName)
      .subscribe(res=>{
        let index = res.json().contents.plugins.indexOf(item.plugin.getBasePlugin().getIdentifier());
        let plugins = res.json().contents.plugins;
        if (index != -1) {
          plugins.splice(index, 1);
          this.saveResource(plugins, this.scope, this.resourcePath, this.fileName)
          .subscribe(res=>{
            this.refreshPinnedPlugins();
          })
        }
      })
    }

  public pinContext(item: LaunchbarItem): ContextMenuItem {
    return {
      "text": this.isPinnedPlugin(item) ? 'Unpin from taskbar' : 'Pin to taskbar',
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
    this.saveResource(arr, this.scope, this.resourcePath, this.fileName)
    .subscribe(res => {
      this.refreshPinnedPlugins();
    })
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/