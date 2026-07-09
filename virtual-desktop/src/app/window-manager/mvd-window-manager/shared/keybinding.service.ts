

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
  public keyUpEvent = new EventEmitter<KeyboardEvent>();
  public keyDownEvent = new EventEmitter<KeyboardEvent>();
  constructor() {
    this.keyUpHandler = this.keyUpHandler.bind(this);
    this.keyDownHandler = this.keyDownHandler.bind(this);
  }

  registerKeyUpEvent() {
    document.addEventListener('keyup', this.keyUpHandler, true);
  }

  registerKeyDownEvent() {
    document.addEventListener('keydown', this.keyDownHandler, true);
  }

  keyUpHandler(event: KeyboardEvent) {
    if(event.altKey && event.ctrlKey) {
      event.stopImmediatePropagation();
      this.keyUpEvent.emit(event);
    }
  }

  keyDownHandler(event: KeyboardEvent) {
    // Emit for Ctrl+Shift or Meta+Shift combos (used by spotlight toggle, etc.)
    if (event.shiftKey && (event.ctrlKey || event.metaKey)) {
      this.keyDownEvent.emit(event);
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

