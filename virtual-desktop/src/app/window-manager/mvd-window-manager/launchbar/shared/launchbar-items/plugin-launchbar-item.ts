

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
import * as html2canvas from 'html2canvas';

export class PluginLaunchbarItem extends LaunchbarItem{// implements ZLUX.PluginWatcher {
  public instanceIds: Array<MVDHosting.InstanceId>;
  public instanceCount: number;
  public windowPreviews: Array<HTMLImageElement>;
  public windowPreviewsIds: Array<number>;

  constructor(
    public readonly plugin: DesktopPluginDefinitionImpl,
    public windowManager: WindowManagerService,
  ) {
    super();

    this.instanceIds = [];
    this.windowPreviews = [];
    this.windowPreviewsIds = [];
    this.instanceCount = 0;
    ZoweZLUX.dispatcher.registerPluginWatcher(plugin.getBasePlugin(), this);
    this.windowManager.screenshotRequestEmitter.subscribe((id)=> {
      if (this.instanceIds.length < 2) {
        return; //performance hack until we get some task viewer that needs this
      }
      let index = this.instanceIds.indexOf(id);
      if (index != -1) {
        this.generateSnapshot(id);
      }
    });
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

  generateSnapshot(instanceId: MVDHosting.InstanceId){
    let index = this.instanceIds.indexOf(instanceId);
    var self = this;
    if(index != -1){
      var windowIds = this.windowManager.getWindowIDs(this.plugin);
      var imgPrev = new Image();
      if (windowIds != null) {
        var windowHTML = this.windowManager.getHTML(windowIds[index]);
      }
      let instanceIndex = self.windowPreviewsIds.indexOf(instanceId);

      if (windowIds != null && windowHTML != -1) {
        html2canvas(windowHTML, {logging:false}).then(function(canvas) {
          imgPrev.src = canvas.toDataURL();
          if (instanceIndex != -1){
            self.windowPreviews[instanceIndex] = imgPrev;
          } else {
            self.windowPreviews.push(imgPrev);
            self.windowPreviewsIds.push(instanceId);
          }
        });
      } else if (instanceIndex == -1) {
        self.windowPreviews.push(imgPrev);
        self.windowPreviewsIds.push(instanceId);
      }
    }
  }

  destroySnapshot(instanceId: MVDHosting.InstanceId) {
    let index = this.windowPreviewsIds.indexOf(instanceId);
    if (index > -1) {
      this.windowPreviews.splice(index, 1);
      this.windowPreviewsIds.splice(index, 1);
    }
  }

  instanceAdded(instanceId: MVDHosting.InstanceId, isEmbedded: boolean|undefined) {
    var self = this;
    if (this.instanceIds.length != 0) {
      //skip first for performance
      setTimeout(function() {
        self.generateSnapshot(instanceId);
      }, 3000);
    } if (this.instanceIds.length == 1) {
      //go back and init first. slightly worse for performance
      self.generateSnapshot(this.instanceIds[0]);
    }
    if (!isEmbedded) {
      this.instanceIds.push(instanceId);
      this.instanceCount++;
    }
  }
  instanceRemoved(instanceId: MVDHosting.InstanceId) {
    this.destroySnapshot(instanceId);
    for (let i = 0 ; i < this.instanceIds.length; i++) {
      if (this.instanceIds[i] === instanceId) {
        this.instanceIds.splice(i,1);
        this.instanceCount--;
        return;
      }
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

