

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

import { ApplicationManager } from './application-manager.service';
import { InjectionManager } from './injection-manager/injection-manager.service';
import { ViewportManager } from './viewport-manager/viewport-manager.service';
import { ViewportComponent } from './viewport-manager/viewport/viewport.component';
import { I18nModule } from '../i18n/i18n.module';

@NgModule({
  imports: [
    SharedModule,
    CommonModule,
    I18nModule
  ],
  declarations: [
    ViewportComponent
  ],
  providers: [
    ApplicationManager,
    ViewportManager,
    InjectionManager,
    /* Make application and viewport manager accessible externally */
    { provide: MVDHosting.Tokens.ApplicationManagerToken, useExisting: ApplicationManager },
    { provide: MVDHosting.Tokens.ViewportManagerToken, useExisting: ViewportManager }
  ],
  exports: [
    ViewportComponent
  ],
  entryComponents: [
    ViewportComponent
  ]
})
export class ApplicationManagerModule {

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

