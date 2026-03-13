

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

// import { BaseLogger } from 'virtual-desktop-logger';

export class LinkDefinitionImpl implements MVDHosting.LinkDefinition {
//  private readonly logger: ZLUX.ComponentLogger = BaseLogger;

  private key:string;
  private link:ZLUX.PluginLink;

  constructor(
    public readonly plugin: ZLUX.Plugin
  ) {
    this.key = plugin.getKey();
    this.link = plugin.getLink() || undefined; //or throw
  }

  getIdentifier(): string {
    return this.plugin.getIdentifier();
  }

  getKey(): string {
    return this.key;
  }

  getBasePlugin(): ZLUX.Plugin {
    return this.plugin;
  }

  getName(): string {
    return this.link.name;
  }

  getAction(): string {
    return this.link.action;
  }

  getIcon(): string {
    return this.link.action;
  }

  getContext(): any {
    return this.link.context;
  }

  isDisabled(): boolean {
    return !!this.link.disabled;
  }

  get image(): string {
    //TODO resolve all different objects here so this is actually returning URLs, and probably allow substitution in icon with env vars of some sort
    const uriBroker = ZoweZLUX.uriBroker;
    let icon = this.link.icon;
    if (icon) {
      return icon;
    } else {
      let plugin = ZoweZLUX.pluginManager.getPlugin(this.plugin.getIdentifier());
      return uriBroker.pluginResourceUri(plugin, plugin.webContent.launchDefinition.imageSrc);
    }
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

