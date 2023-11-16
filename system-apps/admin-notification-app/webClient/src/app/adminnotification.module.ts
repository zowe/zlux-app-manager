
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
// import { HttpModule } from '@angular/http';
import { HttpClientModule } from '@angular/common/http';

import { AdminNotificationComponent } from './adminnotification-component';
import {RadioModule} from "carbon-components-angular";
import {InputModule} from 'carbon-components-angular'
import {DropdownModule} from 'carbon-components-angular'

@NgModule({
  imports: [FormsModule, HttpClientModule, ReactiveFormsModule, CommonModule, RadioModule, InputModule, DropdownModule],
  declarations: [AdminNotificationComponent],
  exports: [AdminNotificationComponent],
  entryComponents: [AdminNotificationComponent]
})
export class AdminNotificationModule { }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

