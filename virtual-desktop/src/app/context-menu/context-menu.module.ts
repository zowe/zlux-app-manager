

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { NgModule } from '@angular/core';
import { ContextMenuComponent } from './context-menu.component';
import { CommonModule } from '@angular/common';
import { ContextMenuService } from './contextmenu.service';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    ContextMenuComponent
  ],
  exports: [
    ContextMenuComponent
  ],
  providers: [
    ContextMenuService
  ]
})
export class ContextMenuModule {

}

export { ContextMenuService } from './contextmenu.service';

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

