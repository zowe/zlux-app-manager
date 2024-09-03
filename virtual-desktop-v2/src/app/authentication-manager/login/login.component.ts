

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, ChangeDetectorRef, Injector } from '@angular/core';
import { AuthenticationManager,
         LoginExpirationIdleCheckEvent } from '../authentication-manager.service';
import { L10nTranslationService } from 'angular-l10n';
import { BaseLogger } from 'virtual-desktop-logger';
import { StorageService } from '../storage.service';
import { StorageKey } from '../storage-enum';
import { IdleWarnService } from '../idleWarn.service';

let ACTIVITY_IDLE_TIMEOUT_MS = 300000; //5 minutes
const HTTP_STATUS_PRECONDITION_REQUIRED = 428;
const PASSWORD_EXPIRED = "PasswordExpired";

type ErrorInfo = {
  errorMessage: string;
  errorDetails: string;
  isFallback: boolean;
};

@Component({
  selector: 'rs-com-login',
  templateUrl: 'login.component.html',
  styleUrls: [ 'login.component.css' ]
})
export class LoginComponent implements OnInit {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private readonly plugin: any = ZoweZLUX.pluginManager.getDesktopPlugin();
  logo: string = require('../../../assets/images/login/Zowe_Logo.png');
  passwordLogo: string = require('../../../assets/images/login/password-reset.png');
  isLoading:boolean;
  needLogin:boolean;
  changePassword:boolean;
  locked: boolean;
  username: string;
  password: string;
  newPassword: string;
  confirmNewPassword: string;
  errorMessage: string;
  showErrorDetails: boolean;
  errorDetails: string;
  loginMessage: string;
  expiredPassword: boolean;
  private passwordServices: Set<string>;
  private themeManager: any;
  public showLogin: boolean;
  public enableExpirationPrompt: boolean;

  constructor(
    private authenticationService: AuthenticationManager,
    private storageService: StorageService,
    public translation: L10nTranslationService,
    private idleWarnService: IdleWarnService,
    private cdr: ChangeDetectorRef,
    private injector: Injector
  ) {
    this.themeManager = this.injector.get(MVDHosting.Tokens.ThemeEmitterToken);
    this.isLoading = true;
    this.needLogin = false;
    this.changePassword = false;
    this.locked = false;
    this.username = '';
    this.password = '';
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.errorMessage = '';
    this.expiredPassword = false;
    this.passwordServices = new Set<string>();
    this.enableExpirationPrompt = true;
    this.renewSession = this.renewSession.bind(this);
    this.isIdle = this.isIdle.bind(this);
    this.showErrorDetails = false;
    this.errorDetails = '';
    this.authenticationService.loginScreenVisibilityChanged.subscribe((eventReason: MVDHosting.LoginScreenChangeReason) => {
      switch (eventReason) {
      case MVDHosting.LoginScreenChangeReason.UserLogout:
        this.needLogin = true;
        this.passwordServices.clear();
        break;
      case MVDHosting.LoginScreenChangeReason.UserLogin:
        this.errorMessage = '';
        this.needLogin = false;
        this.renewSession();
        this.detectActivity();
        break;
      case MVDHosting.LoginScreenChangeReason.PasswordChange:
        this.changePassword = true;
        break;
      case MVDHosting.LoginScreenChangeReason.PasswordChangeSuccess:
        this.changePassword = false;
        break;
      case MVDHosting.LoginScreenChangeReason.HidePasswordChange:
        this.changePassword = false;
        break;
      case MVDHosting.LoginScreenChangeReason.SessionExpired:
        this.backButton();
        this.idleWarnService.removeErrorReport();
        this.errorMessage = this.translation.translate('Session Expired');
        this.needLogin = true;
        break;
      default:
        this.logger.warn('ZWED5168W', eventReason); //this.logger.warn('Ignoring unknown login screen change reason='+eventReason);
      }
      this.isLoading = false;
    });
    this.authenticationService.loginExpirationIdleCheck.subscribe((e: LoginExpirationIdleCheckEvent)=> {
      //it's not just about if its idle, but how long we've been idle for or when we were last active
      if (!this.isIdle()) {
        this.logger.info('ZWED5047I'); /*this.logger.info('Near session expiration, but renewing session due to activity');*/
        this.renewSession();
      } else {
        this.logger.info('ZWED5048I'); /*this.logger.info('Near session expiration. No activity detected, prompting to renew session');*/
        this.spawnExpirationPrompt(e.expirationInMS);
        this.enableExpirationPrompt = true;
      }
    });
    this.showLogin = window.ZOWE_SWM_SHOW_LOGIN == true ? true : false;
  }

  private isIdle(): boolean {
    const activityTime = parseInt(StorageService.getItem(StorageKey.LAST_ACTIVE) || '0');
    let idle = (Date.now() - activityTime) > ACTIVITY_IDLE_TIMEOUT_MS;
    this.logger.debug("ZWED5304I", activityTime, Date.now(), idle); 
    //this.logger.debug(`User lastActive=${lastActive}, now=${Date.now()}, idle={idle}`);
    return idle;
  }

  renewSession(): void {
    this.authenticationService.performSessionRenewal().subscribe((result:any)=> {
      this.idleWarnService.removeErrorReport();
    }, (errorObservable)=> {
      this.idleWarnService.createRetryErrorReport(this.renewSession, this.isIdle);
    });
  }

  spawnExpirationPrompt(expirationInMS: number): void {
    let desktopSize = this.themeManager.mainSize || 2;
    this.idleWarnService.createContinueErrorReport(this.renewSession, this.isIdle, expirationInMS, desktopSize)
  }

  ngOnInit(): void {
    this.passwordServices.clear();
    const storedUsername = this.authenticationService.defaultUsername();
    if (storedUsername != null) {
      this.username = storedUsername;
    }
    this.isLoading = true;
    this.authenticationService.checkSessionValidity().subscribe(
      response => {
        let jsonMessage = response;
        if (jsonMessage.categories) {
          let keys = Object.keys(jsonMessage.categories);
          for (let i = 0; i < keys.length; i++) {
            let plugins = Object.keys(jsonMessage.categories[keys[i]].plugins);
            for (let j = 0; j < plugins.length; j++) {
              if (jsonMessage.categories[keys[i]].plugins[plugins[j]].canChangePassword) {
                this.passwordServices.add(plugins[j]);
              }
            }
          }
        }
        this.needLogin = false;
      }, errorObservable => {
        let error = errorObservable.error;
        if (error !== 'No Session Found') {//generated from auth manager, dont display to user
          try {
            let jsonMessage = error;
            if(jsonMessage) {
              if(jsonMessage.categories) {
                let errorInfo = this.getErrorDetails(jsonMessage);
                if (!errorInfo.isFallback) {
                  if (errorInfo.errorMessage) {
                    this.errorMessage = errorInfo.errorMessage;
                  }
                  if (errorInfo.errorDetails) {
                    this.errorDetails = errorInfo.errorDetails;
                  }
                }
              }
            }
          } catch (e) {
            this.errorMessage = error;
          }
        }
        this.isLoading = false;
        if (!this.showLogin && window['GIZA_PLUGIN_TO_BE_LOADED']) {
          this.authenticationService.spawnApplicationsWithNoUsername();
          this.enableExpirationPrompt = false;
          this.needLogin = false;
        } else {
          this.needLogin = true;
        }
      });
  }

  considerSubmit(event: KeyboardEvent): void {
    if (event.keyCode === 13) {
      if (this.needLogin && !this.expiredPassword) {
        this.attemptLogin();
      } else if (this.expiredPassword || this.changePassword) {
        this.attemptPasswordReset();
      }
    }
  }

  detectActivity(): void {
    this.storageService.updateLastActive();
    this.idleWarnService.removeErrorReport();   
  }

  attemptPasswordReset(): void {
    if (this.newPassword != this.confirmNewPassword) {
      this.errorMessage = "New passwords do not match. Please try again.";
    } else if (this.passwordServices.size == 0) {
      this.errorMessage = "No password reset service available."
    } else if (this.passwordServices.size != 1) {
      this.errorMessage = "Multiple password reset is not available.";
    } else {
      this.authenticationService.performPasswordReset(this.username, this.password, this.newPassword, this.passwordServices.values().next().value).subscribe(
        result => {
          if (this.needLogin) {
            this.password = this.newPassword;
            this.attemptLogin();
          }
          if (this.changePassword) {
            this.authenticationService.passwordChangeSuccessfulScreen();
          }
          this.loginMessage = "";
          this.errorMessage = "";
          this.password = '';
          this.newPassword = '';
          this.confirmNewPassword = '';
        },
        error => {
          let jsonMessage = error.error;
          this.loginMessage = "";
          this.errorMessage = jsonMessage.response;
        }
      )
    }
  }

  attemptLogin(): void {
    this.errorMessage = '';
    this.errorDetails = '';
    this.needLogin = false;
    this.locked = true;
    this.isLoading = true;
    this.showErrorDetails = false;
    // See https://github.com/angular/angular/issues/22426
    this.cdr.detectChanges();
    this.passwordServices.clear();
    if (this.username==null || this.username==''){
      this.errorMessage= this.translation.translate('UsernameRequired');
      this.password = '';
      this.locked = false;
      this.needLogin = true;
      this.isLoading = false;
      return;
    }
    this.authenticationService.performLogin(this.username!, this.password!).subscribe(
      (      result: any) => {
        let jsonMessage = (result as any);
        if (jsonMessage.categories) {
          let nearestExpiration = -1;
          let keys = Object.keys(jsonMessage.categories);
          for (let i = 0; i < keys.length; i++) {
            let category = jsonMessage.categories[keys[i]];
            let nearestExpirationForCategory = -1;
            let pluginKeys = Object.keys(category.plugins);
            for (let j = 0; j < pluginKeys.length; j++) {
              let plugin = category.plugins[pluginKeys[j]];
              if (plugin.expms) {
                if (nearestExpirationForCategory == -1 || nearestExpirationForCategory > plugin.expms) {
                  nearestExpirationForCategory = plugin.expms;
                  if (nearestExpiration == -1 || nearestExpiration > nearestExpirationForCategory) {
                    nearestExpiration = nearestExpirationForCategory;
                    window.localStorage.setItem("ZoweZLUX.expirationTime",nearestExpiration.toString())
                  }
                }
              }
              if (plugin.canChangePassword) {
                this.passwordServices.add(pluginKeys[j]);
              }
            }
          }
          if (nearestExpiration != -1 && nearestExpiration < 300000) {
            ACTIVITY_IDLE_TIMEOUT_MS = Math.round(nearestExpiration/2);
          } else {
            ACTIVITY_IDLE_TIMEOUT_MS = 300000;
          }
        }
        if (this.expiredPassword) {
          this.authenticationService.passwordChangeSuccessfulScreen();
          this.expiredPassword = false;
        }
        this.password = '';
        this.locked = false;
        //little bit of a hack: uriBroker cant finish init due to needing environment which needs login
        (ZoweZLUX.uriBroker as any).fetchAgentPrefix();
      },
      error => {
        this.needLogin = true;
        let jsonMessage = error.error;
        if(jsonMessage) {
          if(jsonMessage.categories) {
            let keys = Object.keys(jsonMessage.categories);
            for (let i = 0; i < keys.length; i++) {
              let plugins = Object.keys(jsonMessage.categories[keys[i]].plugins);
              for (let j = 0; j < plugins.length; j++) {
                if (jsonMessage.categories[keys[i]].plugins[plugins[j]].canChangePassword) {
                  this.passwordServices.add(plugins[j]);
                }
              }
            }
            if (error.status == HTTP_STATUS_PRECONDITION_REQUIRED) {
              this.expiredPassword = true;
              this.loginMessage = this.translation.translate(PASSWORD_EXPIRED);
            } else {
              this.displayErrorDetails(jsonMessage);
              this.password = '';
            } 
          }
        }
        else {
          this.errorMessage = error.error.text();
        }
        this.locked = false;
        this.isLoading = false;
      }
    );
  }

  getPluginVersion(): string | null {
    return "v. " + this.plugin.version;
  }

  backButton(): void {
    if (this.changePassword) {
      this.authenticationService.hidePasswordChangeScreen();
      this.loginMessage = "";
      this.errorMessage = "";
      this.password = "";
      this.newPassword = "";
      this.confirmNewPassword = "";
    }
    if (this.expiredPassword) {
      this.expiredPassword = false;
      this.loginMessage = "";
      this.errorMessage = "";
      this.newPassword = "";
      this.confirmNewPassword = "";
    }
  }

  private getErrorDetails(jsonMessage: any): ErrorInfo {
    let errorMessage: string='';
    let errorDetails: string='';
    let isFallback: boolean = false;
    let failedTypes: string[] = [];
    let failedPlugins = new Set<string>();
    let err;
    this.errorDetails = '';
    let keys = Object.keys(jsonMessage.categories);
    for (let i = 0; i < keys.length; i++) {
      if (!jsonMessage.categories[keys[i]].success) {
        failedTypes.push(keys[i]);
        let plugins = Object.keys(jsonMessage.categories[keys[i]].plugins);
        for (let j = 0; j < plugins.length; j++) {
          err = jsonMessage.categories[keys[i]].plugins[plugins[j]].error;
          if(err) {
            if(err.message) {
              errorMessage = err.message;
            }
            if(!failedPlugins.has(plugins[j]) && (err.message || err.body)) {
              // Appending the error message, error body and corresponding unique plugin-id that have errors
              errorDetails += `${plugins[j]}: ${err.message === undefined ? "": err.message+"\n"}${err.body === undefined ? "":err.body+"\n"}`;
              failedPlugins.add(plugins[j])
            }
          }
        }
      }
    }
    if(!err || !this.errorMessage) {
      isFallback = true;
      errorMessage = this.translation.translate('AuthenticationFailed',
                                                { numTypes: failedTypes.length, types: JSON.stringify(failedTypes) });
    }
    return {
      errorMessage, errorDetails, isFallback
    }
  }
  
  displayErrorDetails(jsonMessage:any): void {
    let errorInfo = this.getErrorDetails(jsonMessage);
    if (errorInfo.errorMessage) {
      this.errorMessage = errorInfo.errorMessage;
    }
    if (errorInfo.errorDetails) {
      this.errorDetails = errorInfo.errorDetails;
    }
  }

  expandError(): void {
    this.showErrorDetails = true;
  }

  collapseError(): void {
    this.showErrorDetails = false;
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

