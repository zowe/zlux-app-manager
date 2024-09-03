/*
This program and the accompanying materials are
made available under the terms of the Eclipse Public License v2.0 which accompanies
this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

SPDX-License-Identifier: EPL-2.0

Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';
import { L10nLocale, L10nStorage } from 'angular-l10n';
import { mapTo } from 'rxjs/operators';
import { LanguageLocaleService } from './language-locale.service';

@Injectable()
export class L10nStorageService implements L10nStorage {

  constructor(private localeService: LanguageLocaleService) {

  }

  public async read(): Promise<L10nLocale | null> {
    const language = this.localeService.getLanguage();
    return Promise.resolve({ language });
  }

  public async write(l11Locale: L10nLocale): Promise<void> {
    return this.localeService.setLanguage(l11Locale.language).pipe(mapTo(void (0))).toPromise();
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
