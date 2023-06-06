

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
import html2canvas from 'html2canvas';

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
      let index = this.instanceIds.indexOf(window.windowId);
      if (index != -1) {
        // TODO: Generate snapshot code needs optimization due to incredible desktop performance slowdown
        // this.generateSnapshot(index);
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

  generateSnapshot(index: number){
    var self = this;
    let instanceId = self.instanceIds[index];
    if (instanceId != -1) {
      var windowHTML = this.windowManager.getHTML(instanceId);
      var imgPrev = new Image();

      if (windowHTML) {
        html2canvas(windowHTML, {logging:false}).then(function(canvas) {
          imgPrev.src = canvas.toDataURL();
          if (self.instanceIds.length == self.windowPreviews.length){
            self.windowPreviews[index] = imgPrev;
          } else {
            self.windowPreviews.push(imgPrev);
          }
        });
      } else if (self.instanceIds.length == self.windowPreviews.length){
        self.windowPreviews.push(imgPrev);
      }
    }
  }

  destroySnapshot(index: number) {
    if (index > -1) {
      this.windowPreviews.splice(index, 1);
    }
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
      this.destroySnapshot(index);
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

