

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
import { BaseLogger } from 'virtual-desktop-logger';
import { PluginManager } from 'app/plugin-manager/shared/plugin-manager';

class ClearZoweZLUX implements MVDHosting.LogoutActionInterface {
  onLogout(username: string | null): boolean {
    ZoweZLUX.notificationManager.removeAll()
    ZoweZLUX.dispatcher.clear();
    return true;
  }
}

class initializeNotificationManager implements MVDHosting.LoginActionInterface {
  onLogin(username: string, plugins: ZLUX.Plugin[]): boolean {
    ZoweZLUX.pluginManager.loadPlugins('bootstrap').then((res: any) => {
      ZoweZLUX.notificationManager._setURL(ZoweZLUX.uriBroker.pluginWSUri(res[0], 'adminnotificationdata', ''),
                                           ZoweZLUX.uriBroker.pluginRESTUri(res[0], 'adminnotificationdata', 'write'))
    })
    return true;
  }
}


//5 minutes default. Less if session is shorter than twice this
const WARNING_BEFORE_SESSION_EXPIRATION_MS = 300000; 

export type LoginExpirationIdleCheckEvent = {
  shortestSessionDuration: number;
  expirationInMS: number;
};

export enum LoginScreenChangeReason {
  UserLogout,
  UserLogin,
  SessionExpired,
  PasswordChange,
  PasswordChangeSuccess,
  HidePasswordChange
};

@Injectable()
export class AuthenticationManager {
  username: string | null;
  private postLoginActions: Array<MVDHosting.LoginActionInterface>;
  private preLogoutActions: Array<MVDHosting.LogoutActionInterface>;
  readonly loginScreenVisibilityChanged: EventEmitter<LoginScreenChangeReason>;
  readonly loginExpirationIdleCheck: EventEmitter<LoginExpirationIdleCheckEvent>;
  private nearestExpiration: number;
  private expirations: Map<string,number>;
  private expirationWarning: any;
  private readonly log: ZLUX.ComponentLogger = BaseLogger;

  constructor(
    public http: Http,
    private injector: Injector,
    private pluginManager: PluginManager
  ) {
    this.log = BaseLogger.makeSublogger("auth");
    this.username = null;
    this.postLoginActions = new Array<MVDHosting.LoginActionInterface>();
    this.preLogoutActions = new Array<MVDHosting.LogoutActionInterface>();
    this.registerPreLogoutAction(new ClearZoweZLUX());
    this.registerPreLogoutAction(this.pluginManager)
    this.registerPostLoginAction(new initializeNotificationManager());
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
      return this.http.get(ZoweZLUX.uriBroker.serverRootUri('auth-refresh'))
        .map(result => {
          let jsonMessage = result.json();
          if (jsonMessage && jsonMessage.categories) {
            let failedTypes = [];
            let keys = Object.keys(jsonMessage.categories);
            for (let i = 0; i < keys.length; i++) {
              if (!jsonMessage.categories[keys[i]].success) {
                failedTypes.push(keys[i]);
              }
            }
            if (failedTypes.length > 0) {
              throw ErrorObservable.create('');//no need for a message here, just standard login prompt.
            }
            this.setSessionTimeoutWatcher(jsonMessage.categories);
            this.username = this.defaultUsername();
            this.performPostLoginActions().subscribe(
              ()=> {
                this.log.debug('ZWED5298I'); //this.log.debug('Done performing post-login actions');
                this.loginScreenVisibilityChanged.emit(LoginScreenChangeReason.UserLogin);
              }
            );
            return result;
          } else {
            throw ErrorObservable.create(result.text());
          }
        });//or throw err to subscriber
    } else {
      return ErrorObservable.create('ZWED5148E - No Session Found');
    }
  }
  
  //requestLogin() used to exist here but it was counter-intuitive in behavior to requestLogout.
  //This was not documented and therefore has been removed to prevent misuse and confusion.
 
  private doLogoutInner(reason: LoginScreenChangeReason): void {
    const windowManager: MVDWindowManagement.WindowManagerServiceInterface =
      this.injector.get(MVDWindowManagement.Tokens.WindowManagerToken);
    if (reason == LoginScreenChangeReason.UserLogout) {
      windowManager.closeAllWindows();
    }
    this.performLogout().subscribe(
      response => {
        this.loginScreenVisibilityChanged.emit(reason);
      },
      (error: any) => {
        this.loginScreenVisibilityChanged.emit(reason);
        this.log.warn('ZWED5149E', error); //this.log.warn('Logout failed! Error=', error);
      }
    );
  }

  requestLogout(): void {
    this.doLogoutInner(LoginScreenChangeReason.UserLogout);
  }

  private performPostLoginActions(): Observable<any> {
    return new Observable((observer)=> {
      this.pluginManager.loadApplicationPluginDefinitions().then((pluginDefs:MVDHosting.DesktopPluginDefinition[])=> {
        let plugins = pluginDefs.map(plugin => plugin.getBasePlugin());
        if (this.username != null) {
          for (let i = 0; i < this.postLoginActions.length; i++) {
            let success = this.postLoginActions[i].onLogin(this.username, plugins);
            this.log.debug("ZWED5299I", i, success); //this.log.debug(`LoginAction ${i}=${success}`);
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
      this.log.debug("ZWED5300I", i, success); //this.log.debug(`LogoutAction ${i}=${success}`);
    }
    ZoweZLUX.pluginManager.pluginsById.clear()
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
      //if someone has a very tiny session, adjust timer
      let logoutAfterWarnTimer = this.nearestExpiration < (WARNING_BEFORE_SESSION_EXPIRATION_MS*2) ?
        Math.round(this.nearestExpiration/5) : WARNING_BEFORE_SESSION_EXPIRATION_MS;
      
      let warnTimer = this.nearestExpiration - logoutAfterWarnTimer;
      
      this.expirationWarning = setTimeout(()=> {       
        this.log.info(`ZWED5022W`, logoutAfterWarnTimer/1000); /*this.log.info(`Session will expire soon! Logout will occur in ${logoutAfterWarnTimer/1000} seconds.`);*/
        this.log.debug("ZWED5301I", this.expirations); //this.log.debug(`Session expirations=`,this.expirations);
        this.loginExpirationIdleCheck.emit({shortestSessionDuration: this.nearestExpiration,
                                            expirationInMS: logoutAfterWarnTimer});
        this.expirationWarning = setTimeout(()=> {
          this.log.warn("ZWED5162W"); //this.log.warn(`Session timeout reached. Clearing desktop for new login.`);
          this.doLogoutInner(LoginScreenChangeReason.SessionExpired);
        },logoutAfterWarnTimer);
      },warnTimer);
      this.log.debug("ZWED5302I", warnTimer); //this.log.debug(`Set session timeout watcher to notify ${warnTimer}ms before expiration`);
    }
  }

  performSessionRenewal(): Observable<Response> {
    this.log.info('ZWED5045I');/*this.log.info('Renewing session');*/
    return this.http.get(ZoweZLUX.uriBroker.serverRootUri('auth-refresh')).map(result=> {
      let jsonMessage = result.json();
      if (jsonMessage && jsonMessage.success === true) {
        this.log.info('ZWED5046I');/*this.log.info('Session renewal successful');*/
        this.setSessionTimeoutWatcher(jsonMessage.categories);
        return result;
      } else {
        this.log.warn("ZWED5163W"); //this.log.warn('Session renewal unsuccessful');
        throw Observable.throw(result);
      }
    });
  }

  performPasswordReset(username: string, password: string, newPassword: string, serviceHandler: string): Observable<Response> {
    return this.http.post(ZoweZLUX.uriBroker.serverRootUri('auth-password'),
                          {username: username, password: password, newPassword: newPassword, serviceHandler: serviceHandler})
    .map(result => {
      return result
    })
  }

  performLogin(username: string, password: string): Observable<Response> {
    return this.http.post(ZoweZLUX.uriBroker.serverRootUri('auth'), { username: username, password: password })
    .map(result => {
      let jsonMessage = result.json();
      if (jsonMessage && jsonMessage.success === true) {
        this.setSessionTimeoutWatcher(jsonMessage.categories);
        window.localStorage.setItem('username', username);
        this.username = username;
        (ZoweZLUX.logger as any)._setBrowserUsername(username);
        this.performPostLoginActions().subscribe(
          ()=> {
            this.log.debug('ZWED5303I'); //this.log.debug('Done performing post-login actions');
            this.loginScreenVisibilityChanged.emit(LoginScreenChangeReason.UserLogin);              
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
        (ZoweZLUX.logger as any)._setBrowserUsername('N/A');
        return response;
      });
  }

  requestPasswordChangeScreen() {
    this.loginScreenVisibilityChanged.emit(LoginScreenChangeReason.PasswordChange);
  }

  hidePasswordChangeScreen() {
    this.loginScreenVisibilityChanged.emit(LoginScreenChangeReason.HidePasswordChange);
  }

  passwordChangeSuccessfulScreen() {
    this.loginScreenVisibilityChanged.emit(LoginScreenChangeReason.PasswordChangeSuccess);
  }
}



/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

