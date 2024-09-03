

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CssUrlPipe } from './css-url.pipe';
import { WindowMonitor } from './window-monitor.service';
import { DirectEmbedComponent } from './direct-embed.component';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    CssUrlPipe,
    DirectEmbedComponent
  ],
  providers: [
    WindowMonitor
  ],
  exports: [
    CssUrlPipe,
    DirectEmbedComponent
  ]
})
export class SharedModule {

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

