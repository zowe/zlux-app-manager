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

@Component({
  selector: 'zowe-launchbar-instance-view',
  templateUrl: './launchbar-instance-view.component.html',
  styleUrls: ['./launchbar-instance-view.component.css']
})
export class LaunchbarInstanceViewComponent {
  @Input() launchbarItem: LaunchbarItem;

  constructor(/*@Inject(MVDHosting.Tokens.ApplicationManagerToken) private applicationManager: MVDHosting.ApplicationManagerInterface*/
  protected windowManager: WindowManagerService) {
  }

  getTitleForWindow(windowId: MVDWindowManagement.WindowId): string {
    let title = this.windowManager.getWindowTitle(windowId);
    if (title === null) {
      return '';
    }
    return title;
  }

  clicked(windowId: MVDWindowManagement.WindowId): void {
//    this.windowManager.showWindow(windowId);
    this.windowManager.requestWindowFocus(windowId);
  }
  
}
