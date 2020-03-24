

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Input, Output, EventEmitter, Injector } from '@angular/core';
import { DesktopTheme } from "../../desktop/desktop.component";
import { LaunchbarItem } from '../shared/launchbar-item';

@Component({
  selector: 'rs-com-launchbar-icon',
  templateUrl: './launchbar-icon.component.html',
  styleUrls: ['./launchbar-icon.component.css', '../shared/shared.css']
})
export class LaunchbarIconComponent {
  @Input() launchbarItem: LaunchbarItem;
  public iconSize: string;
  public indicatorSize: string;
  public indicatorPos: string;
  public hoverOffset: string;
  public hoverBottom: string;
  public _theme:DesktopTheme;
  
  @Input() set theme(newTheme: DesktopTheme) {
    this._theme = newTheme;
    console.log('Launchbar icon theme set=',newTheme);
    switch (newTheme.size.launchbar) {
    case 1:
      this.iconSize="16px";
      this.hoverBottom="14px";
      this.hoverOffset="-22px";
      this.indicatorPos="1px";
      this.indicatorSize = '2px';
      break;
    case 3:
      this.iconSize="64px";
      this.hoverOffset="0px";
      this.hoverBottom="62px";
      this.indicatorPos="-2px";
      this.indicatorSize = '4px';
      break;
    default:
      //2
      this.iconSize="32px";
      this.hoverOffset="-14px";
      this.hoverBottom="30px";
      this.indicatorPos="1px";
      this.indicatorSize = '2px';
      break;
    }
  }
  @Output() iconClicked: EventEmitter<void>;
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  titleVisible: boolean;

  constructor(private injector: Injector) {
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

  onMouseEnter(event: MouseEvent) {
    if (!this.launchbarItem.showInstanceView) {
      this.launchbarItem.showIconLabel = true;
    }
  }

  onMouseLeave(event: MouseEvent) {
    this.launchbarItem.showIconLabel = false;
  }

  onMouseEnterInstanceView(event: MouseEvent) {
    this.launchbarItem.showIconLabel = false;
    this.launchbarItem.showInstanceView = true;
  }

  onMouseLeaveInstanceView(event: MouseEvent) {
    this.launchbarItem.showInstanceView = false;
    this.launchbarItem.showIconLabel = false;
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

