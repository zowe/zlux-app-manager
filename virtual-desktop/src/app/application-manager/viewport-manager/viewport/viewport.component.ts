

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, ComponentRef, Input, Injector } from '@angular/core';

// import { ViewportId } from '../viewport';
import { ApplicationManager } from '../../application-manager.service';

@Component({
  selector: 'com-rs-mvd-viewport',
  templateUrl: 'viewport.component.html'
})
export class ViewportComponent {
  @Input() viewportId: MVDHosting.ViewportId | null;

  constructor(
    private injector: Injector
  ) {
  }

  get componentRef(): ComponentRef<any> | null {
    if (this.viewportId == null) {
      /* Viewport is not yet ready */
      return null;
    }

    const applicationManager = this.injector.get(ApplicationManager);

    return applicationManager.getViewportComponentRef(this.viewportId);
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

