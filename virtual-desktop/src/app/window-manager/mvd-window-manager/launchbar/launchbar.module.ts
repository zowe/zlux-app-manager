

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from 'app/shared/shared.module';

import { LaunchbarComponent } from './launchbar/launchbar.component';
import { LaunchbarIconComponent } from './launchbar-icon/launchbar-icon.component';
import { LaunchbarMenuComponent } from './launchbar-menu/launchbar-menu.component';
import { LaunchbarWidgetComponent } from './launchbar-widget/launchbar-widget.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule
  ],
  declarations: [
    LaunchbarComponent,
    LaunchbarIconComponent,
    LaunchbarMenuComponent,
    LaunchbarWidgetComponent
  ],
  exports: [
    LaunchbarComponent
  ],
})
export class LaunchbarModule { }


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

