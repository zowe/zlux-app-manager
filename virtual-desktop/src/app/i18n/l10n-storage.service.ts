/*
This program and the accompanying materials are
made available under the terms of the Eclipse Public License v2.0 which accompanies
this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

SPDX-License-Identifier: EPL-2.0

Copyright Contributors to the Zowe Project.
*/

// import { Injectable } from '@angular/core';
// import { L10nStorage } from 'angular-l10n';
// import { LanguageLocaleService } from './language-locale.service';

// @Injectable()
// export class L10nStorageService implements L10nStorage {

//   constructor(private localeService: LanguageLocaleService) {

//   }

//   /**
//    * This method must contain the logic to read the storage.
//    * @param name 'defaultLocale', 'currency' or 'timezone'
//    * @return A promise with the value of the given name
//    */
//   public async read(name: string): Promise<string | null> {
//     if (name === 'defaultLocale') {
//       return Promise.resolve(this.localeService.getLanguage());
//     }
//     return Promise.resolve(null);
//   }

//   /**
//    * This method must contain the logic to write the storage.
//    * @param name 'defaultLocale', 'currency' or 'timezone'
//    * @param value The value for the given name
//    */
//   public async write(name: string, value: string): Promise<void> {
//     if (name === 'defaultLocale') {
//       return this.localeService.setLanguage(value).toPromise();
//     }
//     return Promise.resolve();
//   }

// }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
