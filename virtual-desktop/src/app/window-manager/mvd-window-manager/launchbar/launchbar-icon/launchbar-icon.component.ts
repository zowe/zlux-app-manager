

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import {
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  Output,
} from '@angular/core';

import { LaunchbarItem } from '../shared/launchbar-item';
import { FocusableOption } from '@angular/cdk/a11y';

@Component({
  host: {
    'tabindex': '-1'
  },
  selector: 'rs-com-launchbar-icon',
  templateUrl: './launchbar-icon.component.html',
  styleUrls: ['./launchbar-icon.component.css']
})
export class LaunchbarIconComponent implements FocusableOption  {
  @Input() launchbarItem: LaunchbarItem;

  @Output() iconClicked: EventEmitter<void>;
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  titleVisible: boolean;
  constructor(private injector: Injector, private host: ElementRef) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
    this.iconClicked = new EventEmitter();
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
    this.launchbarItem.showIconLabel = false;
  }

  isRunning(): boolean {
    return this.applicationManager.isApplicationRunning(this.launchbarItem.plugin);
  }

  focus(): void {
    this.host.nativeElement.focus();
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

