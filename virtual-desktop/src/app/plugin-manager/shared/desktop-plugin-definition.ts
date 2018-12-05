

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { PluginWindowStyle } from './plugin-window-style';

export class DesktopPluginDefinitionImpl implements MVDHosting.DesktopPluginDefinition {

  public widthOverride:number|undefined;
  public heightOverride:number|undefined;

  /* A default style simplifies the programming, since consumers of defaultWindowStyle
   * don't have to choke on a plugin that lacks a default style in its pluginDefinition.json.
   * If we add proper validation of pluginDefinitions, we maybe should get rid of this (or use it during
   * some UI-driven plugin creation...)
   */
  private static readonly PLUGIN_DEFAULT_WINDOW_STYLE: PluginWindowStyle = {
    width: MVDHosting.DESKTOP_PLUGIN_DEFAULTS.WIDTH,
    height: MVDHosting.DESKTOP_PLUGIN_DEFAULTS.HEIGHT
  };

  constructor(
    public readonly basePlugin: ZLUX.Plugin
  ) {

  }

  get hasWebContent(): boolean {
    return this.basePlugin.getWebContent() != null;
  }

  getFramework(): string {
    if (this.hasWebContent) {
      return this.basePlugin.getWebContent().framework;
    } else {
      console.warn(`Plugin ${this.getIdentifier()} has no framework specified`);
      return 'unsupported';
    }
  }

  getIdentifier(): string {
    return this.basePlugin.getIdentifier();
  }

  getBasePlugin(): ZLUX.Plugin {
    return this.basePlugin;
  }

  getCopyright():string {
    return this.basePlugin.getCopyright();
  }
  
  get label(): string {
    if (this.hasWebContent && this.basePlugin.getWebContent().launchDefinition != null) {
      return this.basePlugin.getWebContent().launchDefinition.pluginShortNameDefault;
    } else {
      return this.basePlugin.getIdentifier().split('\.').slice(-1)[0];
    }
  }

  get image(): string | null {
    // TODO: clean this up with .d.ts
    const uriBroker = (window as any).ZoweZLUX.uriBroker;
    if (!this.hasWebContent){
        return null;
    }
    let webContent:any = this.basePlugin.getWebContent();
    if (webContent.launchDefinition != null
      && webContent.launchDefinition.imageSrc != null) {
      return uriBroker.pluginResourceUri(this.basePlugin, webContent.launchDefinition.imageSrc);
    } else {
      return null;
    }
  }

  get defaultWindowTitle(): string {
    // TODO
    return this.label;
  }

  get defaultWindowStyle(): PluginWindowStyle {
    let style:PluginWindowStyle = 
      ((this.hasWebContent && this.basePlugin.getWebContent().defaultWindowStyle) ?
       (this.basePlugin.getWebContent().defaultWindowStyle as PluginWindowStyle) :
       {
        width: DesktopPluginDefinitionImpl.PLUGIN_DEFAULT_WINDOW_STYLE.width,
        height: DesktopPluginDefinitionImpl.PLUGIN_DEFAULT_WINDOW_STYLE.height
       });
    if (this.widthOverride){
      style.width = this.widthOverride;
    }
    if (this.heightOverride){
      style.height = this.heightOverride;
    }
    return style;
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

