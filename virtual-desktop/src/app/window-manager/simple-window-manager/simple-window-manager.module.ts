

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SimpleWindowManagerService } from './simple-window-manager.service';
import { SimpleComponent } from './simple.component';
import { ApplicationManagerModule } from '../../application-manager/application-manager.module';
import { AuthenticationModule } from '../../authentication-manager/authentication-manager.module';

@NgModule({
  imports: [
    ApplicationManagerModule,
    AuthenticationModule,
    CommonModule,
  ],
  declarations: [
    SimpleComponent
  ],
  exports: [

  ],
  providers: [
    { provide: MVDWindowManagement.Tokens.WindowManagerToken, useClass: SimpleWindowManagerService }
  ]
})
export class SimpleWindowManagerModule {

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

