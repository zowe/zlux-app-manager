/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

// import { Injectable } from '@angular/core';
// import { Observable, of } from 'rxjs';
// import { catchError } from 'rxjs/operators';
//
// import { TranslationProvider, HttpTranslationProvider } from 'angular-l10n';
//
// @Injectable() export class L10nCustomTranslationProvider implements TranslationProvider {
//
//     constructor(private provider: HttpTranslationProvider) { }
//
//   public getTranslation(language: string, args: any): Observable<any> {
//     /*
//       Angular-l10n algorithm that merges translation files leads to unexpected behavior
//       if there is a missing translation file in a chain of fallbacks, e.g.:
//         if messages.es.json is missing in a chain
//           [ messages.es-ES.json -> messages.es.json -> messages.en.json ]
//         it will use translations from  messages.en.json.
//       An empty object solves the issue in case of a missing translation file.
//     */
//     return this.provider.getTranslation(language, args).pipe(catchError(() => of({})));
//   }
//
// }
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
