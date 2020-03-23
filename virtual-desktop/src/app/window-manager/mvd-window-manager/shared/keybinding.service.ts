

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, EventEmitter } from '@angular/core';

@Injectable()
export class KeybindingService {
  public keyupEvent = new EventEmitter<KeyboardEvent>();
  constructor() {
    this.keyUpHandler = this.keyUpHandler.bind(this);
  }

  registerKeyUpEvent() {
    document.addEventListener('keyup', this.keyUpHandler, true);
  }

  keyUpHandler(event: KeyboardEvent) {
    if(event.altKey) {
      console.log('desktop' + event.which);
      event.stopImmediatePropagation();
      this.keyupEvent.emit(event);
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

