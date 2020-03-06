

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, ViewContainerRef, ComponentRef, Input, SimpleChanges } from '@angular/core';
import { BaseLogger } from 'virtual-desktop-logger';

@Component({
  selector: 'direct-embed-component',
  template: ''
})
export class DirectEmbedComponent {
  @Input() component: ComponentRef<any>;
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  constructor(
    private viewContainerRef: ViewContainerRef
  ) {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['component']) {
      this.viewContainerRef.clear();

      this.logger.debug("ZWED5322I", this.component); //this.logger.debug(`ngOnChanges=`,this.component);
      if (this.component != null) {
        this.viewContainerRef.insert(this.component.hostView);
      }
    }
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

