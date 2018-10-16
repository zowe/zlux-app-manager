

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component } from '@angular/core';
import { L10nLoader } from 'angular-l10n';

@Component({
  selector: 'rs-com-root',
  templateUrl: './mvd.component.html',
})
export class MvdComponent {

  constructor(public l10nLoader: L10nLoader) {
    this.l10nLoader.load();
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

