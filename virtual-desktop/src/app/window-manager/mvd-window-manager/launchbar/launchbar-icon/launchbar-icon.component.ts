

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, Input, Output, EventEmitter, Inject } from '@angular/core';

import { LaunchbarItem } from '../shared/launchbar-item';

@Component({
  selector: 'rs-com-launchbar-icon',
  templateUrl: './launchbar-icon.component.html',
  styleUrls: ['./launchbar-icon.component.css']
})
export class LaunchbarIconComponent {
  @Input() launchbarItem: LaunchbarItem;

  @Output() iconClicked: EventEmitter<void>;

  constructor(@Inject(MVDHosting.Tokens.ApplicationManagerToken) private applicationManager: MVDHosting.ApplicationManagerInterface) {
    this.iconClicked = new EventEmitter();
  }

  clicked(): void {
    this.iconClicked.emit();
  }

  isRunning(): boolean {
    return this.applicationManager.isApplicationRunning(this.launchbarItem.plugin);
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

