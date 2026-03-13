/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { ZosmfDiscoveryService } from './zosmf-discovery.service';


@NgModule({
  imports: [
    HttpClientModule,
  ],
  providers: [
    ZosmfDiscoveryService
  ]
})
export class ZosmfModule { }


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
