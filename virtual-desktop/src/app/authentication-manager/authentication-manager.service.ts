

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { BaseLogger } from 'virtual-desktop-logger';
import { PluginManager } from 'app/plugin-manager/shared/plugin-manager';
import { StartURLManager } from '../start-url-manager';
import { StorageService } from './storage.service';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';


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

@Injectable()
export class AuthenticationManager {
  username: string | null;
  private postLoginActions: Array<MVDHosting.LoginActionInterface>;
  private preLogoutActions: Array<MVDHosting.LogoutActionInterface>;
  readonly loginScreenVisibilityChanged: EventEmitter<MVDHosting.LoginScreenChangeReason>;
  readonly loginExpirationIdleCheck: EventEmitter<LoginExpirationIdleCheckEvent>;
  private nearestExpiration: number;
  private expirations: Map<string,number>;
  private expirationWarning: any;
  private storageSubscription: Subscription;
  private readonly log: ZLUX.ComponentLogger = BaseLogger;

  constructor(
    private storageService: StorageService,
    public http: HttpClient,
    private injector: Injector,
    private pluginManager: PluginManager,
    private startURLManager: StartURLManager
  ) {
    this.username = null;
    this.postLoginActions = new Array<MVDHosting.LoginActionInterface>();
    this.preLogoutActions = new Array<MVDHosting.LogoutActionInterface>();
    this.registerPreLogoutAction(new ClearZoweZLUX());
    this.registerPreLogoutAction(this.pluginManager)
    this.registerPostLoginAction(new initializeNotificationManager());
    this.registerPostLoginAction(this.startURLManager);
    this.loginScreenVisibilityChanged = new EventEmitter();
    this.loginExpirationIdleCheck = new EventEmitter();
    this.log = BaseLogger.makeSublogger("auth");
    this.storageSubscription = new Subscription();
  }

  subscribeStorageEvent() {
    this.unsubscribeStorageEvent();
    this.storageSubscription = new Subscription();
    this.storageSubscription.add(this.storageService.sessionEvent.subscribe((reason:MVDHosting.LoginScreenChangeReason)=>{
      this.log.info('ZWED5060I', reason); // Logout on storage Event
      //added extra property to avoid infinite loop
      this.doLogoutInner(reason, true);
    }));
  }

  unsubscribeStorageEvent() {
    this.storageSubscription.unsubscribe();
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
    return this.http.get(ZoweZLUX.uriBroker.serverRootUri('auth-refresh')).pipe(
      map(result => {
        let jsonMessage = (result as any);
        if (jsonMessage && jsonMessage.categories) {
          let failedTypes = [];
          let keys = Object.keys(jsonMessage.categories);
          if (!this.username) {
            this.username = this.defaultUsername();
          }
          let needUsername = !!this.username;
          for (let i = 0; i < keys.length; i++) {
            const category = jsonMessage.categories[keys[i]];
            if (!category.success) {
              failedTypes.push(keys[i]);
            } else if (needUsername && jsonMessage.defaultCategory == keys[i]) {
              //the ui needs to know what the primary username is even if you are signed into different accounts on different apps. So, here is a search for that handler.
              //this could cause a casing difference: standard login uses casing typed, this uses server info.
              let firstHandler = category[Object.keys(category)[1]];
              if (firstHandler.username) {
                this.username = firstHandler.username;
              }                
            }
          }
          if (this.username) {
            (ZoweZLUX.logger as any)._setBrowserUsername(this.username);
          }
          if (failedTypes.length > 0) {
            return throwError('');//no need for a message here, just standard login prompt.
          }
          this.setSessionTimeoutWatcher(jsonMessage.categories);
          this.performPostLoginActions().subscribe(
            ()=> {
              this.log.debug('ZWED5298I'); //this.log.debug('Done performing post-login actions');
              this.loginScreenVisibilityChanged.emit(MVDHosting.LoginScreenChangeReason.UserLogin);
            }
          );
          return result;
        } else {
          return throwError((result as any).text());
        }
      }));//or throw err to subscriber
  }
  
  //requestLogin() used to exist here but it was counter-intuitive in behavior to requestLogout.
  //This was not documented and therefore has been removed to prevent misuse and confusion.
 
  private doLogoutInner(reason: MVDHosting.LoginScreenChangeReason, isStorage: boolean = false): void {
    const windowManager: MVDWindowManagement.WindowManagerServiceInterface =
      this.injector.get(MVDWindowManagement.Tokens.WindowManagerToken);
    if (reason == MVDHosting.LoginScreenChangeReason.UserLogout) {
      windowManager.autoSaveFileAllowDelete = false;
      windowManager.closeAllWindows();
    }

    if(!isStorage) {
      this.storageService.updateSessionEvent(reason);
    }

    this.performLogout().subscribe(
      response => {
        if (reason == MVDHosting.LoginScreenChangeReason.UserLogout) {
          this.username = null;
          (ZoweZLUX.logger as any)._setBrowserUsername('N/A');
        }
        this.loginScreenVisibilityChanged.emit(reason);
        clearTimeout(this.expirationWarning);
        this.unsubscribeStorageEvent();
        this.storageService.clearOnLogout(reason);
      },
      (error: any) => {
        this.loginScreenVisibilityChanged.emit(reason);
        this.log.warn('ZWED5149E', error); //this.log.warn('Logout failed! Error=', error);
      }
    );
  }

  requestLogout(): void {
    this.doLogoutInner(MVDHosting.LoginScreenChangeReason.UserLogout);
  }
  
  public spawnApplicationsWithNoUsername(): any {
    window.localStorage.setItem('username', "");
    this.username = "";
    (ZoweZLUX.logger as any)._setBrowserUsername("");
    this.performPostLoginActions().subscribe(
      () => {
        this.log.debug('ZWED5303I'); //this.log.debug('Done performing post-login actions');
        this.loginScreenVisibilityChanged.emit(MVDHosting.LoginScreenChangeReason.UserLogin);
      }
    );
  }

  private performPostLoginActions(launchAutoSaved?: boolean): Observable<any> {
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

      if (launchAutoSaved !== false) {
        const windowManager: MVDWindowManagement.WindowManagerServiceInterface = this.injector.get(MVDWindowManagement.Tokens.WindowManagerToken);
        windowManager.launchDesktopAutoSavedApplications();
      }
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
    this.subscribeStorageEvent();
    clearTimeout(this.expirationWarning);
    this.nearestExpiration = -1;
    let canRefresh = true;
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
              // if the response does not include capabilities or capabilities.canRefresh
              // we should assume true
              // because a popup that fails is better than expiration when refresh is possible
              canRefresh = true;
              if (typeof plugin.capabilities === 'object') {
                const capabilities: Partial<ZLUXServerFramework.Capabilities> = plugin.capabilities;
                if (typeof capabilities.canRefresh === 'boolean') {
                  canRefresh = capabilities.canRefresh;
                }
              }
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
        if (canRefresh) {
          this.loginExpirationIdleCheck.emit({
            shortestSessionDuration: this.nearestExpiration,
            expirationInMS: logoutAfterWarnTimer
          });
        }
        this.expirationWarning = setTimeout(()=> {
          this.log.warn("ZWED5162W"); //this.log.warn(`Session timeout reached. Clearing desktop for new login.`);
          this.doLogoutInner(MVDHosting.LoginScreenChangeReason.SessionExpired);
        },logoutAfterWarnTimer);
      },warnTimer);
      this.log.debug("ZWED5302I", warnTimer); //this.log.debug(`Set session timeout watcher to notify ${warnTimer}ms before expiration`);
    }
    window.localStorage.setItem("ZoweZLUX.expirationTime",this.nearestExpiration.toString())
  }

  performSessionRenewal(): Observable<Object> {
    this.log.info('ZWED5045I');/*this.log.info('Renewing session');*/
    return this.http.get(ZoweZLUX.uriBroker.serverRootUri('auth-refresh')).pipe(map(result=> {
      let jsonMessage = (result as any);
      if (jsonMessage && jsonMessage.success === true) {
        this.log.info('ZWED5046I');/*this.log.info('Session renewal successful');*/
        this.setSessionTimeoutWatcher(jsonMessage.categories);
        return result;
      } else {
        this.log.warn("ZWED5163W"); //this.log.warn('Session renewal unsuccessful');
        return throwError(result);
      }
    }));
  }

  performPasswordReset(username: string, password: string, newPassword: string, serviceHandler: string): Observable<Object> {
    return this.http.post(ZoweZLUX.uriBroker.serverRootUri('auth-password'),
                          {username: username, password: password, newPassword: newPassword, serviceHandler: serviceHandler});
  }

  performLogin(username: string, password: string): Observable<Object> {
    if (this.username != null && (username != this.username)) {
      const windowManager: MVDWindowManagement.WindowManagerServiceInterface =
        this.injector.get(MVDWindowManagement.Tokens.WindowManagerToken);
      windowManager.closeAllWindows();
    }
    const windowManager: MVDWindowManagement.WindowManagerServiceInterface =
        this.injector.get(MVDWindowManagement.Tokens.WindowManagerToken);
    windowManager.autoSaveFileAllowDelete = true;
    return this.http.post(ZoweZLUX.uriBroker.serverRootUri('auth'), { username: username, password: password })
    .pipe(map(result => {
      let jsonMessage = (result as any);
      if (jsonMessage && jsonMessage.success === true) {
        this.setSessionTimeoutWatcher(jsonMessage.categories);
        window.localStorage.setItem('username', username);
        this.username = username;
        (ZoweZLUX.logger as any)._setBrowserUsername(username);
        this.performPostLoginActions().subscribe(
          ()=> {
            this.log.debug('ZWED5303I'); //this.log.debug('Done performing post-login actions');
            this.loginScreenVisibilityChanged.emit(MVDHosting.LoginScreenChangeReason.UserLogin);
          });
        return result;
      } else {
        return throwError(result);
      }
    }));
  }

  private performLogout(): Observable<Object> {
    this.performPreLogoutActions();
    return this.http.post(ZoweZLUX.uriBroker.serverRootUri('auth-logout'), {});
  }

  requestPasswordChangeScreen() {
    this.loginScreenVisibilityChanged.emit(MVDHosting.LoginScreenChangeReason.PasswordChange);
  }

  hidePasswordChangeScreen() {
    this.loginScreenVisibilityChanged.emit(MVDHosting.LoginScreenChangeReason.HidePasswordChange);
  }

  passwordChangeSuccessfulScreen() {
    this.loginScreenVisibilityChanged.emit(MVDHosting.LoginScreenChangeReason.PasswordChangeSuccess);
  }
}



/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

