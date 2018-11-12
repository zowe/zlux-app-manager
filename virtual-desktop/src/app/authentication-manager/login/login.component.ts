

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthenticationManager, LoginExpirationIdleCheckEvent } from '../authentication-manager.service';
import { TranslationService } from 'angular-l10n';
import { ZluxPopupManagerService, ZluxErrorSeverity } from '@zlux/widgets';

const ACTIVITY_IDLE_TIMEOUT_MS = 60000; //1 minute

@Component({
  selector: 'rs-com-login',
  templateUrl: 'login.component.html',
  styleUrls: [ 'login.component.css' ]
})
export class LoginComponent implements OnInit {
  private readonly plugin: any = ZoweZLUX.pluginManager.getDesktopPlugin();
  logo: string = require('../../../assets/images/login/Zowe_Logo.png');
  isLoading:boolean;
  needLogin:boolean;
  locked: boolean;
  username: string;
  password: string;
  errorMessage: string | null;
  loginMessage: string;
  private isIdle: boolean = false;
  private idleTimeout: any;

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

    this.authenticationService.loginScreenVisibilityChanged.subscribe((needLogin: boolean) => {
      this.needLogin = needLogin;
      this.isLoading = false;
    });
    this.authenticationService.loginExpirationIdleCheck.subscribe((e: LoginExpirationIdleCheckEvent)=> {
      //it's not just about if its idle, but how long we've been idle for or when we were last active
      if (!this.isIdle) {
        this.authenticationService.performSessionRefresh();
      } else {
        this.popupManager.reportError(
          ZluxErrorSeverity.WARNING,
          'Invalid Plugin Identifier',
          `Session will expire from inactivity soon. Click here to continue your session.`, {blocking: false});
      }
    });
  }

  refreshSession(): void {
    console.log('refreshing session.');
    this.isIdle = false;
    this.authenticationService.performSessionRefresh().subscribe();//i dont really care about the result, but angular refuses to do network stuff for me unless i subscribe
    
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
        this.popupManager.reportError(
          ZluxErrorSeverity.WARNING,
          'Invalid Plugin Identifier',
          `Session will expire from inactivity soon. Click here to continue your session.`, {blocking: false});    
  }

  considerSubmit(event: KeyboardEvent): void {
    if (event.keyCode === 13) {
      this.attemptLogin();
    }
  }

  protected detectActivity(): void {
    console.log('activity detected!');
    clearTimeout(this.idleTimeout);
    this.isIdle = false;
    this.idleTimeout = setTimeout(()=> {
      this.isIdle = true;
    },ACTIVITY_IDLE_TIMEOUT_MS);
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

