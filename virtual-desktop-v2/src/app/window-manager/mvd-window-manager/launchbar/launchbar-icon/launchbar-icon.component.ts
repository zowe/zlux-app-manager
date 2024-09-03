

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Input, Output, EventEmitter, Injector, ElementRef, ViewChild } from '@angular/core';
import { DesktopTheme } from "../../desktop/desktop.component";
import { LaunchbarItem } from '../shared/launchbar-item';
import { BaseLogger } from '../../../../shared/logger';

@Component({
  selector: 'rs-com-launchbar-icon',
  templateUrl: './launchbar-icon.component.html',
  styleUrls: ['./launchbar-icon.component.css', '../shared/shared.css']
})
export class LaunchbarIconComponent {
  public iconSize: string;
  public indicatorSize: string;
  public indicatorPos: string;
  public hoverOffset: string;
  public hoverBottom: string;
  public _theme:DesktopTheme;
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private mouseDownListener: boolean;

  @Input() launchbarItem: LaunchbarItem;
  @ViewChild('launchbarIconContainer') componentElement: ElementRef;
  @Input() set theme(newTheme: DesktopTheme) {
    this._theme = newTheme;
    this.logger.debug("Set new launchbar icon theme with: ", this._theme);
    switch (newTheme.size.launchbar) {
      case 1:
        this.iconSize="16px";
        this.hoverBottom="14px";
        this.hoverOffset="-22px";
        this.indicatorPos="2px";
        this.indicatorSize = '2px';
        break;
      case 3:
        this.iconSize="64px";
        this.hoverOffset="0px";
        this.hoverBottom="62px";
        this.indicatorPos="-2px";
        this.indicatorSize = '4px';
        break;
      default: //Medium size - 2
        this.iconSize="32px";
        this.hoverOffset="-14px";
        this.hoverBottom="30px";
        this.indicatorPos="2px";
        this.indicatorSize = '2px';
        break;
    }
  }
  @Output() iconClicked: EventEmitter<void>;

  constructor(private injector: Injector) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
    this.iconClicked = new EventEmitter();
    this.mouseDownListener = false;
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

  onMouseLeaveInstanceView(event: MouseEvent) {
    if (!this.mouseDownListener) {
      window.addEventListener('mousedown', () => this.onMouseDownInstanceView());
      this.mouseDownListener = true;
    }
  }

  onMouseEnterInstanceView(event: MouseEvent) {
    this.launchbarItem.showIconLabel = false;
    if (!this.mouseDownListener) {
      window.addEventListener('mousedown', () => this.onMouseDownInstanceView());
      this.mouseDownListener = true;
    }
  }

  onMouseDownInstanceView() {
    if (this.launchbarItem.showInstanceView && event
        && !this.componentElement.nativeElement.contains(event.target)) {
      this.launchbarItem.showInstanceView = false;
      this.launchbarItem.showIconLabel = false;
      this.mouseDownListener = false;
      window.removeEventListener('mousedown', () => this.onMouseDownInstanceView());
    }
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

