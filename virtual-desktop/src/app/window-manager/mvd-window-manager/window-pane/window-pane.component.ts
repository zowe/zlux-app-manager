

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit } from '@angular/core';
import { ContextMenuItem } from 'pluginlib/inject-resources';

import { DesktopWindow } from '../shared/desktop-window';
import { WindowManagerService } from '../shared/window-manager.service';
import { BaseLogger } from 'virtual-desktop-logger';

@Component({
  selector: 'rs-com-window-pane',
  templateUrl: 'window-pane.component.html',
  styleUrls: ['window-pane.component.css']
})
export class WindowPaneComponent implements OnInit {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  contextMenuDef: {xPos: number, yPos: number, items: ContextMenuItem[]} | null;

  constructor(
    public windowManager: WindowManagerService
  ) {
    this.logger.debug("Window-pane-component wMgr=",windowManager);
    this.contextMenuDef = null;
  }

  ngOnInit(): void {
    this.windowManager.contextMenuRequested.subscribe(menuDef => {
      this.contextMenuDef = menuDef;
    });
  }

  closeContextMenu(): void {
    this.contextMenuDef = null;
  }

  get windows(): DesktopWindow[] {
    return this.windowManager.getAllWindows();
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

