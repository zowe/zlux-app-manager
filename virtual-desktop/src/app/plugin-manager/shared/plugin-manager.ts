

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, EventEmitter } from '@angular/core';

import { DesktopPluginDefinitionImpl } from './desktop-plugin-definition';
import { PluginLoader } from './plugin-loader';

const SCAN_INTERVAL_MINIMUM = 300000;

@Injectable()
export class PluginManager implements MVDHosting.PluginManagerInterface, MVDHosting.LogoutActionInterface {
  private static _pluginDefinitions: Map<string, MVDHosting.DesktopPluginDefinition> = new Map();
  private static _scanner: any;

  public pluginsAdded: EventEmitter<MVDHosting.DesktopPluginDefinition[]> = new EventEmitter();

  constructor(
    private pluginLoader: PluginLoader
  ) {
  }

  unsetScanner(): boolean {
    return this.setScanInterval(0);
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
  
  onLogout(): boolean {
    if (PluginManager._scanner) {
      clearInterval(PluginManager._scanner);
    }
    PluginManager._pluginDefinitions.clear();
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

