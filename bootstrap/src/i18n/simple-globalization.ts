/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

export class SimpleGlobalization implements ZLUX.Globalization {
  getLanguage(): string {
    return navigator.language.split('-')[0];
  }

  getLocale(): string {
    const navigatorLanguage: string[] = navigator.language.split('-');
    if (navigatorLanguage && navigatorLanguage.length > 1) {
      return navigatorLanguage[1];
    } else {
      return 'US';
    }
  }


  //These setters are not used, therefore these should not be called.  At runtime, simple-globalization is replaced with
  //the globalization in virtual desktop
  setLanguage(language: string): any {
    return language;
  }

  setLocale(locale: string): any{
    return locale;
  }
  
}
