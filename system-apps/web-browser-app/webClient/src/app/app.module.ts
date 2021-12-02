

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { L10nTranslationModule, L10nCache, L10nTranslationService } from 'angular-l10n';
import { AppComponent } from './app.component';
import { BrowserModule } from './browser/browser.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    CommonModule,
    BrowserModule,
    {
      ngModule: L10nTranslationModule,
      providers: [ L10nCache, L10nTranslationService ] // New Cache and Translation Service
    }  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(
    private translation: L10nTranslationService,
  ) {
    this.translation.init();
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

