

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector, EventEmitter } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';

class ClearDispatcher implements MVDHosting.LogoutActionInterface {
  onLogout(username: string | null): boolean {
    ZoweZLUX.dispatcher.clear();
    return true;
  }
}

const WARNING_BEFORE_SESSION_EXPIRATION_MS = 300000; //5 minutes
//const ACTIVITY_IDLE_TIMEOUT_MS = 60000; //1 minute

export type LoginExpirationIdleCheckEvent = {
  shortestSessionDuration: number;
  timeUntilExpiration: number;
};

/*
type AuthResponseCategory = {
  authenticated: boolean;
  plugins: object;
}

type AuthHandlerResponse = {
  authenticated: boolean;
  username?: string;
  expms?: number;
}
*/

@Injectable()
export class AuthenticationManager {
  username: string | null;
  private postLoginActions: Array<MVDHosting.LoginActionInterface>;
  private preLogoutActions: Array<MVDHosting.LogoutActionInterface>;
  readonly loginScreenVisibilityChanged: EventEmitter<boolean>;
  readonly loginExpirationIdleCheck: EventEmitter<LoginExpirationIdleCheckEvent>;
  private log: ZLUX.ComponentLogger;
  private nearestExpiration: number;
  private expirations: Map<string,number>;
  private expirationWarning: any;
  
  constructor(
    public http: Http,
    private injector: Injector
  ) {
    //TODO: Find a way to get the logger in a more formal manner if possible
    this.log = ZoweZLUX.logger.makeComponentLogger("com.rs.mvd.ng2desktop.authentication");
    this.username = null;
    this.postLoginActions = new Array<MVDHosting.LoginActionInterface>();
    this.preLogoutActions = new Array<MVDHosting.LogoutActionInterface>();
    this.registerPreLogoutAction(new ClearDispatcher());
    this.loginScreenVisibilityChanged = new EventEmitter();
    this.loginExpirationIdleCheck = new EventEmitter();
  }

  registerPostLoginAction(action:MVDHosting.LoginActionInterface):void {
    this.postLoginActions.push(action);
  }

  registerPreLogoutAction(action:MVDHosting.LogoutActionInterface):void {
    this.preLogoutActions.push(action);
  }

  getUsername(): string | null {
    return this.username;
  }

  defaultUsername(): string | null {
    return window.localStorage.getItem('username');
  }

  checkSessionValidity(): Observable<any> {
    if (this.defaultUsername() != null) {
      return this.http.get(ZoweZLUX.uriBroker.serverRootUri('auth'))
        .map(result => {
          let jsonMessage = result.json();
          if (jsonMessage && jsonMessage.categories) {
            let failedTypes = [];
            let keys = Object.keys(jsonMessage.categories);
            for (let i = 0; i < keys.length; i++) {
              if (!jsonMessage.categories[keys[i]].authenticated) {
                failedTypes.push(keys[i]);
              }
            }
            if (failedTypes.length > 0) {
              throw ErrorObservable.create('');//no need for a message here, just standard login prompt.
            }
            this.username = this.defaultUsername();
            this.performPostLoginActions().subscribe(
              ()=> {
                this.log.debug('Done performing post-login actions');
                this.loginScreenVisibilityChanged.emit(false);
              }
            );
            return result;
          } else {
            throw ErrorObservable.create(result.text());
          }
        });//or throw err to subscriber
    } else {
      return ErrorObservable.create('No Session Found');
    }
  }

  requestLogin(): void {
    this.loginScreenVisibilityChanged.emit(true);
  }

  requestLogout(): void {
    const windowManager: MVDWindowManagement.WindowManagerServiceInterface = this.injector.get(MVDWindowManagement.Tokens.WindowManagerToken);
    windowManager.closeAllWindows();
    this.performLogout().subscribe(
      response => {
        this.requestLogin();
      },
      error => {
        this.requestLogin();
        this.log.warn('Logout failed!');
        this.log.warn(error);
      }
    );
  }

  private performPostLoginActions(): Observable<any> {
    return new Observable((observer)=> {      
      ZoweZLUX.pluginManager.loadPlugins(ZLUX.PluginType.Application).then((plugins:ZLUX.Plugin[])=> {
        if (this.username != null) {
          for (let i = 0; i < this.postLoginActions.length; i++) {
            let success = this.postLoginActions[i].onLogin(this.username, plugins);
            this.log.debug(`LoginAction ${i}=${success}`);
          }
        }
        observer.next(true);
        observer.complete();
      }).catch((err:any)=> {
        observer.error(err);
      });
    });
  }

  private performPreLogoutActions() {
    for (let i = 0; i < this.preLogoutActions.length; i++) {
      let success = this.preLogoutActions[i].onLogout(this.username);
      this.log.debug(`LogoutAction ${i}=${success}`);
    }
  }

  private lockScreenInner() {
    this.loginScreenVisibilityChanged.emit(true);
  }

  public lockScreen() {
    this.lockScreenInner();
  }
  

  private setSessionTimeoutWatcher(categories: any|undefined) {
    if (!categories) {
      return;
    }
    clearTimeout(this.expirationWarning);
    this.nearestExpiration = -1;
    let expirations = new Map<string,number>();
    let now = Date.now();
    for (let key in categories) {
      let category:any = categories[key];
      let nearestExpirationForCategory: number = -1;
      for (let pluginKey in category.plugins) {
        let plugin = category.plugins[pluginKey];
        if (plugin.expms) {
          if (nearestExpirationForCategory == -1 || nearestExpirationForCategory > plugin.expms) {
            nearestExpirationForCategory = plugin.expms;
            if (this.nearestExpiration == -1 || this.nearestExpiration > nearestExpirationForCategory) {
              this.nearestExpiration = nearestExpirationForCategory;
            }
          }
        }
      }
      expirations.set(category, now+nearestExpirationForCategory);
    }
    this.expirations = expirations;
    if (this.nearestExpiration != -1) {
      let lockAfterWarnTimer = this.nearestExpiration < (WARNING_BEFORE_SESSION_EXPIRATION_MS*2) ? Math.round(this.nearestExpiration/5) : WARNING_BEFORE_SESSION_EXPIRATION_MS; //if someone has a very tiny session
      let warnTimer = this.nearestExpiration - lockAfterWarnTimer;
      
      this.expirationWarning = setTimeout(()=> {
        let now = Date.now();
        this.log.info(`Session will expire soon! Now=${now}, Expiration at ${now+lockAfterWarnTimer}`);
        this.log.info(`Session expirations=${this.expirations.toString()}`);
        this.expirationWarning = setTimeout(()=> {
          this.log.warn(`Session timeout reached, locking session to prompt for re-authentication`);
          
          this.lockScreenInner();
        },lockAfterWarnTimer);
      },warnTimer);
      this.log.info(`Set session timeout watcher to notify when approaching ${warnTimer}ms before expiration`);      
    }
  }

  performSessionRefresh(): Observable<Response> {
    console.log('service calling auth-refresh');
    return this.http.get(ZoweZLUX.uriBroker.serverRootUri('auth-refresh')).map(result=> {
      return result;
    });
  }

  performLogin(username: string, password: string): Observable<Response> {
    return this.http.post(ZoweZLUX.uriBroker.serverRootUri('auth'), { username: username, password: password })
    .map(result => {
      let jsonMessage = result.json();
      if (jsonMessage && jsonMessage.success === true) {
        this.setSessionTimeoutWatcher(jsonMessage.categories);
        window.localStorage.setItem('username', username);
        this.username = username;
        this.performPostLoginActions().subscribe(
          ()=> {
            this.log.debug('Done performing post-login actions');
            this.loginScreenVisibilityChanged.emit(false);              
          });
        return result;
      } else {
        throw Observable.throw(result);
      }
    });
  }

  private performLogout(): Observable<Response> {
    this.performPreLogoutActions();    
    return this.http.post(ZoweZLUX.uriBroker.serverRootUri('auth-logout'), {})
      .map(response => {
        this.username = null;
        return response;
      });
  }
}



/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

