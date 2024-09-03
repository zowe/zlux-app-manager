

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
  public sessionEvent:EventEmitter<MVDHosting.LoginScreenChangeReason>;

  constructor() {
    this.lastActive = new EventEmitter<Number>();
    this.sessionEvent = new EventEmitter<MVDHosting.LoginScreenChangeReason>();
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
        case StorageKey.SESSION_EVENT: {
          this.emitSessionEvent(newValue || undefined);
        }
        break;
        default: break;
      }
    }
  }

  public updateLastActive() {
    this.logger.debug('ZWED5305I'); //this.logger.debug('User activity detected');
    const activityTime = Date.now();
    StorageService.setItem(StorageKey.LAST_ACTIVE,activityTime.toString());
    this.lastActive.next(activityTime);
  }

  public updateSessionEvent(reason: MVDHosting.LoginScreenChangeReason) {
    this.logger.info('ZWED5062I'); // Update SESSION EVENT Storage
    // appended timestamp at end of value to make value unique to trigger events
    StorageService.setItem(StorageKey.SESSION_EVENT, reason.toString()+','+Date.now().toString());
  }

  private emitSessionEvent(newValue?: string | null) { 
    this.logger.debug('ZWED5063I', newValue);
    let reason;
    if(newValue && newValue.indexOf(',')>0) {
     reason = newValue.split(',')[0];
    }
    if(reason === MVDHosting.LoginScreenChangeReason.SessionExpired.toString() ) {
      this.logger.info('ZWED5058I'); //Received Session Expired from Storage
      this.sessionEvent.emit(MVDHosting.LoginScreenChangeReason.SessionExpired);
    } else if (reason === MVDHosting.LoginScreenChangeReason.UserLogout.toString()) {
      this.logger.info('ZWED5059I'); //Received Session Logout from Storage
      this.sessionEvent.emit(MVDHosting.LoginScreenChangeReason.UserLogout);
    }
  }

  public clearOnLogout(reason: MVDHosting.LoginScreenChangeReason) {
    this.logger.info('ZWED5061I'); //Clear Storage on Logout
    StorageService.removeItem(StorageKey.LAST_ACTIVE);
    StorageService.removeItem(StorageKey.SESSION_EVENT);
    StorageService.removeItem(StorageKey.EXPIRATION_TIME)
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

