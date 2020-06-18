

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable, EventEmitter } from '@angular/core';
import { StorageKey } from './storage-enum';
import { BaseLogger } from 'virtual-desktop-logger';


@Injectable()
export class StorageService {
  public static setItem(key: string, newValue: string) {
    window.localStorage.setItem(key, newValue);
  }

  public static getItem(key: string): string | null {
    return window.localStorage.getItem(key);
  }

  public static removeItem(key: string) {
    return window.localStorage.removeItem(key);
  }

  public static clear(key: string) {
    return window.localStorage.clear();
  }

  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  public lastActive:EventEmitter<Number>;

  constructor() {
    this.lastActive = new EventEmitter<Number>();
    this.storageEventHandler = this.storageEventHandler.bind(this);
    window.addEventListener("storage", this.storageEventHandler);
  }

  private storageEventHandler(event: StorageEvent) {
    this.logger.debug('storageEventListener');
    if (event.storageArea == localStorage) {
      const newValue = event.newValue;
      switch(event.key) {
        case StorageKey.LAST_ACTIVE: {
          this.lastActive.emit(Number(newValue));
        }
        break;
        default: break;
      }
    }
  }

  public updateLastActive() {
    this.logger.debug('ZWED5305I','activity'); //this.logger.debug('User activity detected');
    const activityTime = Date.now();
    StorageService.setItem(StorageKey.LAST_ACTIVE,activityTime.toString());
    this.lastActive.next(activityTime);
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

