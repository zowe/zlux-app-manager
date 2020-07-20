/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { PluginManager } from 'zlux-base/plugin-manager/plugin-manager';

const settingsKey = 'org.zowe.zlux.sample.angular.mobileclient.settings';

interface Settings {
  url: string;
  username: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loggedIn: boolean;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
  ) {
    this.loginForm = this.fb.group({
      url: '',
      username: '',
      password: ''
    });
  }

  ngOnInit() {
    let settings: Settings = null;
    try {
      settings = JSON.parse(window.localStorage.getItem(settingsKey));
    } catch (e) {
      this.log.warn(`invalid settings found in local strorage ${e.message}`);
    }
    if (settings) {
      this.loginForm.patchValue(settings);
    }
  }

  onLogin(): void {
    const { url, username, password } = this.loginForm.value;
    const baseURL = `${url}${url.endsWith('/') ? '' : '/'}`;
    ZoweZLUX.uriBroker.setBaseUrl(baseURL);
    const authURL = ZoweZLUX.uriBroker.serverRootUri('auth');
    this.http.post<any>(authURL, { username, password })
      .subscribe(_ => {
        this.log.info('auth ok');
        window.localStorage.setItem(settingsKey, JSON.stringify({url, username}));
        this.loggedIn = true;
        PluginManager.loadPlugins();
        this.router.navigate(['app']);
      }, _ => this.log.warn('auth failed'));
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/