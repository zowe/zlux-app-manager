/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, Input } from '@angular/core';
import { DesktopTheme } from "../../desktop/desktop.component";
import { LaunchbarItem } from '../shared/launchbar-item';
import { WindowManagerService } from '../../shared/window-manager.service';

const INSTANCE_INITIAL_OFFSET = 180
const INSTANCE_ADDITIONAL_OFFSET = 105

@Component({
  selector: 'zowe-launchbar-instance-view',
  templateUrl: './launchbar-instance-view.component.html',
  styleUrls: ['./launchbar-instance-view.component.css']
})
export class LaunchbarInstanceViewComponent {

  public viewerBottom:string;
  public color:any;
  
  @Input() launchbarItem: LaunchbarItem;
  @Input() set theme(newTheme: DesktopTheme) {
    this.color = newTheme.color;
    switch (newTheme.size.launchbar) {
    case 1:
      this.viewerBottom = '29px';
      break;
    case 3:
      this.viewerBottom = '80px';
      break;
    default: // Default size is medium - 2
      this.viewerBottom = '45px';
    }
  }
  constructor(/*@Inject(MVDHosting.Tokens.ApplicationManagerToken) private applicationManager: MVDHosting.ApplicationManagerInterface*/
  public windowManager: WindowManagerService) {
  }

  ngOnInit(){
    //Doesn't check right bounds yet, for somereason bounds.right isn't giving the expected values
    //and not sure why at this time
    this.launchbarItem.showIconLabel = false;
    let bounds = (<HTMLImageElement>document.getElementsByClassName("instance-viewer")[0]).getBoundingClientRect();
    if (bounds != null) {
      if (bounds.left - (INSTANCE_INITIAL_OFFSET + (INSTANCE_ADDITIONAL_OFFSET  * (this.launchbarItem.instanceIds.length - 2)))  < 0 ) {
        (<HTMLImageElement>document.getElementsByClassName("instance-viewer")[0]).style.left = '4px';
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

  isWindowFocused(windowId: MVDWindowManagement.WindowId): boolean {
    return this.windowManager.windowHasFocus(windowId);
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
