

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { LaunchbarItem } from '../launchbar-item';
import { WindowManagerService } from '../../../shared/window-manager.service';

export class PluginLaunchbarItem extends LaunchbarItem{// implements ZLUX.PluginWatcher {
  public instanceIds: Array<MVDHosting.InstanceId>;
  public windowPreviews: Array<HTMLImageElement>;

  constructor(
    public readonly plugin: DesktopPluginDefinitionImpl,
    public windowManager: WindowManagerService,
  ) {
    super();

    this.instanceIds = [];
    this.windowPreviews = [];
    let pluginId = this.plugin.getBasePlugin().getIdentifier();
    ZoweZLUX.dispatcher.registerPluginWatcher(this.plugin.getBasePlugin(), this);
    this.windowManager.screenshotRequestEmitter.subscribe((window: {pluginId: string, windowId: number})=> {
      if (window.pluginId != pluginId) {
        return;
      }
      if (this.instanceIds.length < 2) {
        return; //performance hack until we get some task viewer that needs this
      }
    });
  }

  get tooltip(): string {
    return this.plugin.basePlugin.getWebContent().descriptionDefault;
  }

  get label(): string {
    return this.plugin.label;
  }

  get image(): string | null {
    return this.plugin.image;
  }

  get launchMetadata(): any {
    return null;
  }

  get instanceIdArray(): Array<MVDHosting.InstanceId> {
    return this.instanceIds;
  }

  instanceAdded(instanceId: MVDHosting.InstanceId, isEmbedded: boolean|undefined) {
    //var self = this;
    if (!isEmbedded) {
      this.instanceIds.push(instanceId);
      //let index = this.instanceIds.length-1;
      if (this.instanceIds.length != 1) {
        //skip first for performance
        setTimeout(function() {
          // TODO: Generate snapshot code needs optimization due to incredible desktop performance slowdown
          //self.generateSnapshot(index);
        }, 3000);
      } if (this.instanceIds.length == 2) {
        //go back and init first. slightly worse for performance
        // TODO: Generate snapshot code needs optimization due to incredible desktop performance slowdown
        //self.generateSnapshot(0);
      }
    }
  }
  instanceRemoved(instanceId: MVDHosting.InstanceId) {
    let index = this.instanceIds.indexOf(instanceId);
    if (index != -1) {
      this.instanceIds.splice(index,1);
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

