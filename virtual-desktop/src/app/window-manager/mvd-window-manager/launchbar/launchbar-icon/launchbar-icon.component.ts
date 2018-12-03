

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, Input } from '@angular/core';

import { LaunchbarItem } from '../shared/launchbar-item';

@Component({
  selector: 'rs-com-launchbar-icon',
  templateUrl: './launchbar-icon.component.html',
  styleUrls: ['./launchbar-icon.component.css']
})
export class LaunchbarIconComponent {
  @Input() launchbarItem: LaunchbarItem;

  titleVisible: boolean;

  constructor(/*@Inject(MVDHosting.Tokens.ApplicationManagerToken) private applicationManager: MVDHosting.ApplicationManagerInterface*/) {

  }
/*
  clicked(): void {
    if (this.launchbarItem.instanceCount > 1) {
      this.instanceViewVisible = true;
    }
  }
*/  
  onMouseEnter(event: MouseEvent, item: LaunchbarItem) {
    if (!this.launchbarItem.showInstanceView) {
      this.launchbarItem.showIconLabel = true;
    }
  }
  onMouseLeave(event: MouseEvent, item: LaunchbarItem) {
    this.launchbarItem.showIconLabel = false;
  }

  onMouseEnterInstanceView(event: MouseEvent, item: LaunchbarItem) {
    this.launchbarItem.showIconLabel = false;
    this.launchbarItem.showInstanceView = true;
  }

  onMouseLeaveInstanceView(event: MouseEvent, item: LaunchbarItem) {
    this.launchbarItem.showInstanceView = false;
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

