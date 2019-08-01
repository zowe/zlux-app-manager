/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, Input } from '@angular/core';

import { LaunchbarItem } from '../shared/launchbar-item';
import { WindowManagerService } from '../../shared/window-manager.service';

const INSTANCE_TOP_HEIGHT = 250 //Height of the instance viewer plus the height of the taskbar
const INSTANCE_INITIAL_OFFSET = 180
const INSTANCE_ADDITIONAL_OFFSET = 105

@Component({
  selector: 'zowe-launchbar-instance-view',
  templateUrl: './launchbar-instance-view.component.html',
  styleUrls: ['./launchbar-instance-view.component.css']
})
export class LaunchbarInstanceViewComponent {
  @Input() launchbarItem: LaunchbarItem;

  constructor(/*@Inject(MVDHosting.Tokens.ApplicationManagerToken) private applicationManager: MVDHosting.ApplicationManagerInterface*/
  public windowManager: WindowManagerService) {
  }

  ngOnInit(){
    //Doesn't check right bounds yet, for somereason bounds.right isn't giving the expected values
    //and not sure why at this time
    this.launchbarItem.showIconLabel = false;
    let bounds = (<HTMLImageElement>document.getElementsByClassName("instance-viewer")[0]).getBoundingClientRect();
    (<HTMLImageElement>document.getElementsByClassName("instance-viewer")[0]).style.top = (document.body.clientHeight - INSTANCE_TOP_HEIGHT) + 'px';
    if (bounds != null) {
      if (bounds.left - (INSTANCE_INITIAL_OFFSET + (INSTANCE_ADDITIONAL_OFFSET  * (this.launchbarItem.instanceIds.length - 2)))  < 0 ) {
        (<HTMLImageElement>document.getElementsByClassName("instance-viewer")[0]).style.left = 0 + 'px';
      } else {
        (<HTMLImageElement>document.getElementsByClassName("instance-viewer")[0]).style.left = 
        bounds.left - (INSTANCE_INITIAL_OFFSET + (INSTANCE_ADDITIONAL_OFFSET  * (this.launchbarItem.instanceIds.length - 2))) + 'px';
      }
    }
  }

  getTitleForWindow(windowId: MVDWindowManagement.WindowId): string {
    let title = this.windowManager.getWindowTitle(windowId);
    if (title === null) {
      return '';
    }
    return title;
  }

  clicked(windowId: MVDWindowManagement.WindowId, item: LaunchbarItem): void {
    this.windowManager.requestWindowFocus(windowId);
  }

  getPreview(index: number, item: LaunchbarItem) {
    try {
      return item.windowPreviews[index].src;
    }
    catch(err) {
      // this spams when preview is pending or App doesnt work with preview,
      // and the failure case is obvious enough that a console log doesnt help
      return null;
    }
  }
}
