

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';

import { DesktopPluginDefinitionImpl } from './desktop-plugin-definition';
import { PluginLoader } from './plugin-loader';

@Injectable()
export class PluginManager implements MVDHosting.PluginManagerInterface, MVDHosting.LoginActionInterface, MVDHosting.LogoutActionInterface {
  private _pluginDefinitions: Map<string, MVDHosting.DesktopPluginDefinition>;

  constructor(
    private pluginLoader: PluginLoader
  ) {
    this.loadApplicationPluginDefinitionsMap();
  }

  onLogin(): boolean {
    this._pluginDefinitions.clear();
    this.loadApplicationPluginDefinitionsMap();
    return true;
  }

  onLogout(): boolean {
    this._pluginDefinitions.clear();
    return true;
  }

  loadApplicationPluginDefinitions(): Promise<MVDHosting.DesktopPluginDefinition[]> {
    if (this._pluginDefinitions != null) {
      if (this._pluginDefinitions.size != 0) {
        return Promise.resolve(Array.from(this._pluginDefinitions.values()));
      }
    }
    return ZoweZLUX.pluginManager.loadPlugins('application')
      .then((plugins: ZLUX.Plugin[]) => plugins.map(plugin => new DesktopPluginDefinitionImpl(plugin)));
  }

  loadApplicationPluginDefinitionsMap(): Promise<Map<string, MVDHosting.DesktopPluginDefinition>> {
    if (this._pluginDefinitions != null) {
      if (this._pluginDefinitions.size != 0) {
        return Promise.resolve(this._pluginDefinitions);
      }
    }
    return this.loadApplicationPluginDefinitions()
      .then((plugins: MVDHosting.DesktopPluginDefinition[]) => {
        const map = new Map();
        plugins.forEach((plugin) => map.set(plugin.getIdentifier(), plugin));
        plugins.forEach((plugin) => this.pluginLoader.loadPluginComponentFactories(plugin));
        this._pluginDefinitions = map;
      })
      .then(() => this._pluginDefinitions);
  }

  findPluginDefinition(identifier: string): Promise<MVDHosting.DesktopPluginDefinition | null> {
    return this.loadApplicationPluginDefinitionsMap().then(map => map.get(identifier) || null);
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

