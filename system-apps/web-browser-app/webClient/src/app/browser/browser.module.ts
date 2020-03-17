/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserComponent } from './browser/browser.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddressBarComponent } from './address-bar/address-bar.component';
import { BrowserWindowComponent } from './browser-window/browser-window.component';
import { NavigationService } from './services/navigation.service';
import { ProxyService } from './services/proxy.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  declarations: [
    AddressBarComponent,
    BrowserComponent,
    BrowserWindowComponent,
  ],
  providers: [
    NavigationService,
    ProxyService,
  ],
  exports: [
    BrowserComponent
  ]
})
export class BrowserModule { }


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
