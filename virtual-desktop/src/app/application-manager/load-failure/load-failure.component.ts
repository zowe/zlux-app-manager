

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, Inject } from '@angular/core';

import { LOAD_FAILURE_ERRORS } from 'app/application-manager/load-failure/failure-injection-tokens';

@Component({
  templateUrl: 'load-failure.component.html',
  styleUrls: ['load-failure.component.css']
})
export class LoadFailureComponent {
  constructor(
    @Inject(LOAD_FAILURE_ERRORS) public errors: any[]
  ) {

  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

