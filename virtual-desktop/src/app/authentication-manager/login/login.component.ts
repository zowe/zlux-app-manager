

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthenticationManager,
         LoginScreenChangeReason,
         LoginExpirationIdleCheckEvent } from '../authentication-manager.service';
import { TranslationService } from 'angular-l10n';
//import { Observable } from 'rxjs/Observable';
import { ZluxPopupManagerService, ZluxErrorSeverity } from '@zlux/widgets';
import { BaseLogger } from 'virtual-desktop-logger';

const ACTIVITY_IDLE_TIMEOUT_MS = 300000; //5 minutes

@Component({
  selector: 'rs-com-login',
  templateUrl: 'login.component.html',
  styleUrls: [ 'login.component.css' ]
})
export class LoginComponent implements OnInit {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private readonly plugin: any = ZoweZLUX.pluginManager.getDesktopPlugin();
  logo: string = require('../../../assets/images/login/Zowe_Logo.png');
  isLoading:boolean;
  needLogin:boolean;
  locked: boolean;
  username: string;
  password: string;
  errorMessage: string | null;
  loginMessage: string;
  private idleWarnModal: any;
  private lastActive: number = 0;

  constructor(
    private authenticationService: AuthenticationManager,
    private translation: TranslationService,
    private cdr: ChangeDetectorRef,
    private popupManager: ZluxPopupManagerService    
  ) {
    this.isLoading = true;
    this.needLogin = false;
    this.locked = false;
    this.username = '';
    this.password = '';
    this.errorMessage = null;

    this.authenticationService.loginScreenVisibilityChanged.subscribe((eventReason: LoginScreenChangeReason) => {
      switch (eventReason) {
      case LoginScreenChangeReason.UserLogout:
        this.needLogin = true;
        break;
      case LoginScreenChangeReason.UserLogin:
        this.errorMessage = '';
        this.needLogin = false;
        break;
      case LoginScreenChangeReason.SessionExpired:
        if (this.idleWarnModal) {
          this.popupManager.removeReport(this.idleWarnModal.id); 
          this.idleWarnModal = undefined;
        }
        this.errorMessage = this.translation.translate('Session Expired');
        this.needLogin = true;
        break;
      default:
        this.logger.warn('Ignoring unknown login screen change reason='+eventReason);
      }
      this.isLoading = false;
    });
    this.authenticationService.loginExpirationIdleCheck.subscribe((e: LoginExpirationIdleCheckEvent)=> {
      //it's not just about if its idle, but how long we've been idle for or when we were last active
      if (!this.isIdle()) {
        this.logger.info('Near session expiration, but renewing session due to activity');
        this.renewSession();
      } else {
        this.logger.info('Near session expiration. No activity detected, prompting to renew session');
        this.idleWarnModal = this.popupManager.createErrorReport(
          ZluxErrorSeverity.WARNING,
          this.translation.translate('Session Expiring Soon'),
          this.translation.translate('Session will expire unless renewed.',
                { expirationInMS: e.expirationInMS/1000 })
          +this.translation.translate('Click here to renew your session.'),
          {
            blocking: false,
            buttons: [this.translation.translate('Continue')]
          });
        this.idleWarnModal.subject.subscribe((buttonName:any)=> {
          if (buttonName == this.translation.translate('Continue')) {
            //may fail, so don't touch timers yet
            this.renewSession();
          }
        });
      }
    });
  }

  private isIdle(): boolean {
    let idle = (Date.now() - this.lastActive) > ACTIVITY_IDLE_TIMEOUT_MS;
    this.logger.debug(`User lastActive=${this.lastActive}, now=${Date.now()}, idle={idle}`);
    return idle;
  }

  renewSession(): void {
    this.authenticationService.performSessionRenewal().subscribe((result:any)=> {
      if (this.idleWarnModal) {
        this.idleWarnModal.subject.unsubscribe();
        this.idleWarnModal = undefined;
      }
    }, (errorObservable)=> {
      if (this.idleWarnModal) {
        this.idleWarnModal.subject.unsubscribe();
        this.idleWarnModal = this.popupManager.createErrorReport(
          ZluxErrorSeverity.WARNING,
          this.translation.translate('Session Renewal Error'),
          this.translation.translate('Session could not be renewed. Logout will occur unless renewed. Click here to retry.'), 
          {
            blocking: false,
            buttons: [this.translation.translate('Retry'), this.translation.translate('Dismiss')]
          });
        this.idleWarnModal.subject.subscribe((buttonName:any)=> {
          if (buttonName == this.translation.translate('Retry')) {
            this.renewSession();
          }
        });        
      }
    });
  }

  ngOnInit(): void {
    const storedUsername = this.authenticationService.defaultUsername();
    if (storedUsername != null) {
      this.username = storedUsername;
    }
    this.isLoading = true;
    this.authenticationService.checkSessionValidity().subscribe(
      response => {
        this.needLogin = false;
      }, errorObservable => {
        let error = errorObservable.error;
        if (error !== 'No Session Found') {//generated from auth manager, dont display to user
          try {
            let jsonMessage = JSON.parse(error);
            if (jsonMessage.categories) {
              let failedTypes = [];
              let keys = Object.keys(jsonMessage.categories);
              for (let i = 0; i < keys.length; i++) {
                if (!jsonMessage.categories[keys[i]].success) {
                  failedTypes.push(keys[i]);
                }
              }
              this.errorMessage = this.translation.translate('AuthenticationFailed',
                { numTypes: failedTypes.length, types: JSON.stringify(failedTypes) });
            }
          } catch (e) {
            this.errorMessage = error;
          }
        }
        this.isLoading = false;
        this.needLogin = true;
      });
  }

  considerSubmit(event: KeyboardEvent): void {
    if (event.keyCode === 13) {
      this.attemptLogin();
    }
  }

  detectActivity(): void {
    this.logger.debug('User activity detected');
    this.lastActive = Date.now();
    if (this.idleWarnModal) {
      this.popupManager.removeReport(this.idleWarnModal.id); 
      this.idleWarnModal = undefined;
    }    
  }

  attemptLogin(): void {
    this.errorMessage = null;
    this.needLogin = false;
    this.locked = true;
    this.isLoading = true;
    // See https://github.com/angular/angular/issues/22426
    this.cdr.detectChanges();

    if (this.username==null || this.username==''){
      this.errorMessage= this.translation.translate('UsernameRequired');
      this.password = '';
      this.locked = false;
      this.needLogin = true;
      this.isLoading = false;
      return;
    }
    this.authenticationService.performLogin(this.username!, this.password!).subscribe(
      result => {
        this.password = '';
        this.locked = false;
      },
      error => {
        this.needLogin = true;
        let jsonMessage = error.json();
        if (jsonMessage) {
          if (jsonMessage.categories) {
            let failedTypes = [];
            let keys = Object.keys(jsonMessage.categories);
            for (let i = 0; i < keys.length; i++) {
              if (!jsonMessage.categories[keys[i]].success) {
                failedTypes.push(keys[i]);
              }
            }
            this.errorMessage = this.translation.translate('AuthenticationFailed',
              { numTypes: failedTypes.length, types: JSON.stringify(failedTypes) });

          }
        } else {
          this.errorMessage = error.text();
        }
        this.password = '';
        this.locked = false;
        this.isLoading = false;
      }
    );
  }

  getPluginVersion(): string | null {
    return "v. " + this.plugin.version;
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

