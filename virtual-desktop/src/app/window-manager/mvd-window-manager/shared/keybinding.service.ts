

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';

import { Subject, Observable } from 'rxjs/Rx';

@Injectable()
export class KeybindingService {
  public keyupEvent: Subject<KeyboardEvent>;

  constructor() {
    this.keyupEvent = new Subject();
  }

  registerKeyUpEvent(appChild:Element) {
    let elm = appChild.closest('rs-com-mvd-desktop');
    if(elm) {
      const observable = Observable.fromEvent(elm, 'keyup' ) as Observable<KeyboardEvent>;
      observable
        .filter(value => value.altKey && value.ctrlKey)
        .subscribe(this.keyupEvent);
      console.log('registered for keyup desktop');
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

