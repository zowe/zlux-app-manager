
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

import { PagesRoutingModule } from './pages-routing.module';

import { CreateComponent } from './create/create.component';
import { EditComponent } from './edit/edit.component';
import { LandingComponent } from './landing/landing.component';

import {
  InputModule,
  SelectModule,
  TableModule,
  NFormsModule,
  DialogModule,
  SearchModule,
  ButtonModule,
  TilesModule,
  DropdownModule,
  BreadcrumbModule,
} from 'carbon-components-angular';

@NgModule({
  imports: [
    CommonModule,
    PagesRoutingModule,
    HttpClientModule,
    FormsModule,
    InputModule,
    SelectModule,
    TableModule,
    NFormsModule,
    DialogModule,
    SearchModule,
    ButtonModule,
    TilesModule,
    DropdownModule,
    BreadcrumbModule,
  ],
  declarations: [
    CreateComponent,
    EditComponent,
    LandingComponent,
  ],
  exports: [
    CreateComponent,
    EditComponent,
    LandingComponent,
  ]
})
export class PagesModule { }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
