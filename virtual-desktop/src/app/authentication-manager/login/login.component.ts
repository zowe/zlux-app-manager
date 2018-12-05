

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthenticationManager } from '../authentication-manager.service';
import { TranslationService } from 'angular-l10n';

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

  constructor(
    private authenticationService: AuthenticationManager,
    private translation: TranslationService,
    private cdr: ChangeDetectorRef
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
            const jsonMessage = error.json();
            if (this.isAuthResponseMessage(jsonMessage)) {
              if (this.isZssConnectionErrorMessage(jsonMessage)) {
                this.errorMessage = this.translation.translate('FailedToCommunicateWithZssAuthenticationServer');
              } else {
                this.errorMessage = this.translation.translate('IncorrectUsernameAndOrPassword');
              }
            } else {
              this.errorMessage = error.text();
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
        const jsonMessage = error.json();
        if (this.isAuthResponseMessage(jsonMessage)) {
          if (this.isZssConnectionErrorMessage(jsonMessage)) {
            this.errorMessage = this.translation.translate('FailedToCommunicateWithZssAuthenticationServer');
          } else {
            this.errorMessage = this.translation.translate('IncorrectUsernameAndOrPassword');
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

  isAuthResponseMessage(message: any): message is AuthResponseMessage {
    if (typeof message !== 'object') {
      return false;
    }
    if (typeof message.categories !== 'object') {
      return false;
    }
    if (typeof message.success !== 'boolean') {
      return false;
    }
    return true;
  }

  isZssConnectionErrorMessage(authResponse: AuthResponseMessage): boolean {
    if (typeof authResponse.categories['zss'] !== 'object') {
      return false;
    }
    const pluginAuthMessages = authResponse.categories['zss'].plugins;
    if (typeof pluginAuthMessages !== 'object') {
      return false;
    }
    for (const pluginId of Object.keys(pluginAuthMessages)) {
      const authMessage = pluginAuthMessages[pluginId];
      if (authMessage.success === false && authMessage.reason === 'ConnectionError') {
        return true;
      }
    }
    return false;
  }

  getPluginVersion(): string | null {
    return "v. " + this.plugin.version;
  }
}

interface AuthResponseMessage {
  categories: {
    [categoryId: string]: {
      success: boolean,
      plugins: {
        [pluginId: string]: PluginAuthMessage
      }
    }
  },
  success: boolean
}

interface PluginAuthMessage {
    success: boolean,
    reason?: 'ConnectionError'
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

