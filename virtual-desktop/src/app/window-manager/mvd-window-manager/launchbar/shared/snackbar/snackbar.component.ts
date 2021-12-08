

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Inject } from '@angular/core';
import { MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material';
import { TranslationService } from 'angular-l10n';
import { LanguageLocaleService } from 'app/i18n/language-locale.service';

@Component({
  selector: 'app-snackbar',
  templateUrl: './snackbar.component.html',
  styleUrls: [ 'snackbar.component.css' ]
})
export class SnackbarComponent {
  constructor(
    public translation: TranslationService,
    public snackBarRef: MatSnackBarRef<SnackbarComponent>,
    public languageLocaleService: LanguageLocaleService,
    @Inject(MAT_SNACK_BAR_DATA) public data: any
  ) { this.languageLocaleService; }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
