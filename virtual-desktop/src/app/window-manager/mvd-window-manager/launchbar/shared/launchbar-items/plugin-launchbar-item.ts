

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { LaunchbarItem } from '../launchbar-item';
//import { Observable, Observer } from '../../../../../../../node_modules/rxjs';

export class PluginLaunchbarItem extends LaunchbarItem implements ZLUX.PluginWatcher {
  public instanceIds: Array<MVDHosting.InstanceId>;
  public instanceCount: number;
//  private clickObserver: Observer<boolean>;
  constructor(
    public readonly plugin: DesktopPluginDefinitionImpl
  ) {
    super();
    /*
    this.observableClick = Observable.create((observer: Observer<boolean>)=> {
      this.clickObserver = observer;
    });
*/
    this.instanceIds = [];
    this.instanceCount = 0;
    ZoweZLUX.dispatcher.registerPluginWatcher(plugin.getBasePlugin(), this);
  }
/*
  clicked():void {
    this.clickObserver.next(true);
  }
*/
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
    if (!isEmbedded) {
      this.instanceIds.push(instanceId);
      this.instanceCount++;
    }
  }
  instanceRemoved(instanceId: MVDHosting.InstanceId) {
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

