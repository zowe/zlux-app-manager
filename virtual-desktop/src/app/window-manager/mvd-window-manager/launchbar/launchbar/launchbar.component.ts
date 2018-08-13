

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, Inject } from '@angular/core';

import { LaunchbarItem } from '../shared/launchbar-item';
import { PluginLaunchbarItem } from '../shared/launchbar-items/plugin-launchbar-item';
import { DesktopPluginDefinitionImpl } from "app/plugin-manager/shared/desktop-plugin-definition";

@Component({
  selector: 'rs-com-launchbar',
  templateUrl: './launchbar.component.html',
  styleUrls: ['./launchbar.component.css']
})
export class LaunchbarComponent {
  allItems: LaunchbarItem[];
  private isActive: boolean;

  constructor(
    @Inject(MVDHosting.Tokens.PluginManagerToken) public pluginManager: MVDHosting.PluginManagerInterface,
    @Inject(MVDHosting.Tokens.ApplicationManagerToken) public applicationManager: MVDHosting.ApplicationManagerInterface
  ) {
    this.allItems = [];
    this.isActive = false;
  }

  ngOnInit(): void {
    this.allItems = [];

    this.pluginManager.loadApplicationPluginDefinitions().then(pluginDefinitions => {
      pluginDefinitions.forEach((p)=> {
        if (p.getBasePlugin().getWebContent() != null) {
          this.allItems.push(new PluginLaunchbarItem(p as DesktopPluginDefinitionImpl));
        }
      });
    });
  }

  activeToggle(): void {
    this.isActive = !this.isActive;
  }

  get pinnedItems(): LaunchbarItem[] {
    return this.allItems.filter(item => item.pinned);
  }

  pinnedItemClicked(item: LaunchbarItem): void {
    this.applicationManager.showApplicationWindow(item.plugin);
  }

  menuItemClicked(item: LaunchbarItem): void {
    this.applicationManager.showApplicationWindow(item.plugin);
  }

  onStateChanged(isActive: boolean): void {
    this.isActive = isActive;
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

