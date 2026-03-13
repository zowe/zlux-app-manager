

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, EventEmitter } from '@angular/core';

import { DesktopPluginDefinitionImpl } from './desktop-plugin-definition';
import { LinkDefinitionImpl } from './link-definition';
import { PluginLoader } from './plugin-loader';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Plugin } from 'zlux-base/plugin-manager/plugin'

const SCAN_INTERVAL_MINIMUM = 300000;

@Injectable()
export class PluginManager implements MVDHosting.PluginManagerInterface, MVDHosting.LogoutActionInterface, MVDHosting.LinkManagerInterface {
  private static _pluginDefinitions: Map<string, MVDHosting.DesktopPluginDefinition> = new Map();
  private static _linkDefinitionsByApp: Map<string, MVDHosting.LinkDefinition[]> = new Map();
  private static _linkDefinitionsByKey: Map<string, MVDHosting.LinkDefinition> = new Map();
  private static _scanner: any;

  public pluginsAdded: EventEmitter<MVDHosting.DesktopPluginDefinition[]> = new EventEmitter();
  public linksAdded: EventEmitter<MVDHosting.LinkDefinition[]> = new EventEmitter();
  public linkRemoved: EventEmitter<MVDHosting.LinkDefinition> = new EventEmitter();
  
  constructor(
    private pluginLoader: PluginLoader,
    private http: HttpClient,
  ) {
  }

  unsetScanner(): boolean {
    return this.setScanInterval(0);
  }

  private getLinksFromConfig(): Observable<any> {
    return this.http.get(ZoweZLUX.uriBroker.pluginConfigUri(ZoweZLUX.pluginManager.getDesktopPlugin(), 'links', 'default.json'));
  }
  private putLinksToConfig(links:any): void {
    this.http.put(ZoweZLUX.uriBroker.pluginConfigUri(ZoweZLUX.pluginManager.getDesktopPlugin(), 'links', 'default.json'),links).subscribe(res=>{});
  }
  
  getLinksByApp(plugin: MVDHosting.DesktopPluginDefinition): MVDHosting.LinkDefinition[]|undefined {
    return PluginManager._linkDefinitionsByApp.get(plugin.getIdentifier());
  }

  getLinks(): MVDHosting.LinkDefinition[] {
    let links:MVDHosting.LinkDefinition[] = [];
    PluginManager._linkDefinitionsByKey.forEach((value, key)=> {
      links.push(value);
    });
    return links;
  }

  private _addLinkInternal(plugin: any, name: string, action:string, context:any, overwrite: boolean, icon?:string): boolean {
    let identifier;
    let key: any;
    let apps: any;
    let index;
    let impl: any;
    let type;
    // TODO: These conditional assignments are super hacky and are meant to account for various types of "plugin" being received
    if ((plugin.getBasePlugin() && plugin.getBasePlugin().type)) {
      plugin.getBasePlugin()._definition.link = { action: action, context: context, name: name };
      impl = new LinkDefinitionImpl(plugin.getBasePlugin());
      identifier = plugin.getBasePlugin().getIdentifier();
      key = `${name}:${identifier}`;
      apps = PluginManager._linkDefinitionsByApp.get(identifier) || [];
      index = apps.findIndex((app: { getName: () => any; })=> app.getName() == impl.getName());
      type = plugin.getBasePlugin().type;
    } else if (plugin.getBasePlugin().getBasePlugin())
    {
      impl = new LinkDefinitionImpl(plugin.getBasePlugin());
      key = `${name}:${plugin.getIdentifier()}`;
      apps = PluginManager._linkDefinitionsByApp.get(plugin.getIdentifier()) || [];
      index = apps.findIndex((app: { getName: () => any; })=> app.getName() == impl.getName());
      type = plugin.getBasePlugin().getBasePlugin().type;
    }
    if (type == 'link') {
      if (index == -1) {
        apps.push(impl);
      } else if (overwrite) {
        apps.splice(index, 1, impl);
      }
      if (index == -1 || overwrite) {
        PluginManager._linkDefinitionsByApp.set(plugin.getIdentifier(),apps);
        PluginManager._linkDefinitionsByKey.set(key,impl);
        const jsonEntry = {
          identifier: plugin.getIdentifier(),
          apiVersion: "2.0.0",
          pluginVersion: plugin.getBasePlugin().getVersion(),
          pluginType: "link",
          link: {
            action: action,
            context: context,
            icon: icon
          }
        }

        this.getLinksFromConfig().subscribe((res:any)=> {
          let links = res.contents || {};
          links[key] = jsonEntry;
          this.putLinksToConfig(links);
        });
        this.linksAdded.emit([impl]);
        return true;
      }
    }
    return false;
  }

  setLink(plugin: MVDHosting.DesktopPluginDefinition, name: string, action:string, context:any, icon?:string): boolean {
    return this._addLinkInternal(plugin, name, action, context, true, icon);
  }

  addLink(plugin: MVDHosting.DesktopPluginDefinition, name: string, action:string, context:any, icon?:string): boolean {
    return this._addLinkInternal(plugin, name, action, context, false, icon);
  }
  
  removeLink(link: MVDHosting.LinkDefinition): boolean {
    const key = `${link.getName()}:${link.getIdentifier()}`;
    console.log('get key=',key);
    if (PluginManager._linkDefinitionsByKey.get(key)) {
      let apps = PluginManager._linkDefinitionsByApp.get(link.getIdentifier());
      if (apps) {
        const index = apps.findIndex(app=> app.getName() == link.getName());
        if (index != -1) {
          PluginManager._linkDefinitionsByKey.delete(key);
          apps.splice(index, 1);
          PluginManager._linkDefinitionsByApp.set(link.getIdentifier(),apps);
          this.getLinksFromConfig().subscribe((res:any)=> {
            let links = res.contents;
            console.log('fetched links as=',links);
            if (links && links[key]) {
              delete links[key];
              this.putLinksToConfig(links);
            }
          });
          this.linkRemoved.emit(link);
          return true;
        }
      }
    }
    return false;
  }


  setScanInterval(ms: number): boolean {
    if (ms <= 0) {
      if (PluginManager._scanner) {
        clearInterval(PluginManager._scanner);
      }
      return true;
    }

    if (ms >= SCAN_INTERVAL_MINIMUM) {
      if (PluginManager._scanner) {
        clearInterval(PluginManager._scanner);
      }
      PluginManager._scanner = setInterval(()=> {
        this.updateMap();
      },ms);
      return true;      
    }
    return false;
  }

  onLogin(username:string, plugins:ZLUX.Plugin[]):boolean {
    this.getLinksFromConfig().subscribe((res:any)=> {
      let links = res.contents || {};
      let keys = Object.keys(links);
      const impls:LinkDefinitionImpl[] = [];
      keys.forEach(function(key:any) {
        let link = links[key];
        let pluginIndex = plugins.findIndex((plugin)=>plugin.getIdentifier() == link.identifier);
        if (pluginIndex != -1) {
          let sourcePlugin = plugins[pluginIndex];
          let name = key.substring(0,key.indexOf(':'));
          link.link.name = name;
          if (!link.pluginVersion) {
            link.pluginVersion = sourcePlugin.getVersion();
          }
          let impl = new LinkDefinitionImpl(Plugin.parsePluginDefinition(link));
          impls.push(impl);
          PluginManager._linkDefinitionsByKey.set(`${impl.getName()}:${impl.getIdentifier()}`,impl);
          let appLinks = PluginManager._linkDefinitionsByApp.get(impl.getIdentifier()) || [];
          appLinks.push(impl);
          PluginManager._linkDefinitionsByApp.set(impl.getIdentifier(), appLinks);
        }
      });
      this.linksAdded.emit(impls);
    });
    return true;
  }

  onLogout(): boolean {
    if (PluginManager._scanner) {
      clearInterval(PluginManager._scanner);
    }
    PluginManager._pluginDefinitions.clear();
    PluginManager._linkDefinitionsByApp.clear();
    PluginManager._linkDefinitionsByKey.clear();
    return true;
  }

  loadApplicationPluginDefinitions(update?:boolean): Promise<MVDHosting.DesktopPluginDefinition[]> {
    if (!update && PluginManager._pluginDefinitions != null) {
      if (PluginManager._pluginDefinitions.size != 0) {
        return Promise.resolve(Array.from(PluginManager._pluginDefinitions.values()));
      }
    }
    return ZoweZLUX.pluginManager.loadPlugins('application', update)
      .then((plugins: ZLUX.Plugin[]) => {
        if (PluginManager._pluginDefinitions.size != 0) {
          plugins = plugins.filter(plugin => !PluginManager._pluginDefinitions.get(plugin.getIdentifier()))
        }
        const pluginDefs = plugins.map(plugin => new DesktopPluginDefinitionImpl(plugin));
        pluginDefs.forEach((plugin) => PluginManager._pluginDefinitions.set(plugin.getIdentifier(), plugin));
        pluginDefs.forEach((plugin) => this.pluginLoader.loadPluginComponentFactories(plugin));
        if (pluginDefs.length > 0) {
          this.pluginsAdded.emit(pluginDefs);
        }
        return pluginDefs;
      });
  }

  loadApplicationPluginDefinitionsMap(update?:boolean): Promise<Map<string, MVDHosting.DesktopPluginDefinition>> {
    if (!update && PluginManager._pluginDefinitions != null) {
      if (PluginManager._pluginDefinitions.size != 0) {
        return Promise.resolve(PluginManager._pluginDefinitions);
      }
    }
    return this.loadApplicationPluginDefinitions()
      .then((plugins: MVDHosting.DesktopPluginDefinition[]) => {
        return PluginManager._pluginDefinitions;
      });
  }

  updateMap(): Promise<Map<string, MVDHosting.DesktopPluginDefinition>> {
    return this.loadApplicationPluginDefinitionsMap(true);
  }

  findPluginDefinition(identifier: string, update?:boolean): Promise<MVDHosting.DesktopPluginDefinition | null> {
    return this.loadApplicationPluginDefinitionsMap(update).then(map => map.get(identifier) || null);
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

