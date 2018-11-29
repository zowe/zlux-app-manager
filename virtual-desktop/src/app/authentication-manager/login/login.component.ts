

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

