
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { PasswordResetComponent } from './passwordreset-component';
import {InputModule} from '@rocketsoftware/carbon-components-angular'
import {ButtonModule} from '@rocketsoftware/carbon-components-angular'

@NgModule({
  imports: [FormsModule, HttpModule, ReactiveFormsModule, ButtonModule, CommonModule, InputModule],
  declarations: [PasswordResetComponent],
  exports: [PasswordResetComponent],
  entryComponents: [PasswordResetComponent]
})
export class PasswordResetModule { }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

