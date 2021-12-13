

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ZluxPopupManagerModule } from '@zlux/widgets';
import { LoginComponent } from './login/login.component';
import { AuthenticationManager } from './authentication-manager.service';
import { StartURLManagerModule } from '../start-url-manager';
import { StorageService } from './storage.service';
import { IdleWarnService } from './idleWarn.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    ZluxPopupManagerModule,
    StartURLManagerModule,
  ],
  declarations: [
    LoginComponent
  ],
  exports: [
    LoginComponent
  ],
  providers: [
    AuthenticationManager,
    /* Expose authentication manager to window managers */
    { provide: MVDHosting.Tokens.AuthenticationManagerToken, useExisting: AuthenticationManager },
    StorageService,
    IdleWarnService
  ]
})
export class AuthenticationModule {

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

