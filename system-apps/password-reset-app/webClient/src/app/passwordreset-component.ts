
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, Injector, ViewChild, ElementRef } from '@angular/core';
import {Http} from '@angular/http';


@Component({
  selector: 'passwordreset',
  templateUrl: 'passwordreset-component.html',
  styleUrls: ['passwordreset-component.scss']
})

export class PasswordResetComponent {
  private response: string;
  private displayText: boolean;
  username: string;
  @ViewChild('responseElem') responseElem: ElementRef;
  private authenticationManager: MVDHosting.AuthenticationManagerInterface;

  constructor(private http: Http,
    private injector: Injector,
    ) {
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.response = "";
    this.displayText = true;
    this.username = this.authenticationManager.getUsername();
  }

  resetPassword(password: string, newPassword: string, confirmedPassword: string): void {
    if (confirmedPassword != newPassword) {
      this.response = "New passwords do not match please try again."
      this.responseElem.nativeElement.style.color = '#b70000';
      return;
    }
    this.http.post(ZoweZLUX.uriBroker.serverRootUri('auth-password'), 
                          {username: this.username, password: password, newPassword: newPassword})
    .subscribe(
      result => {
        this.response = result.json().categories.zss.plugins['org.zowe.zlux.auth.zss'].response
        this.responseElem.nativeElement.style.color = 'black';
      },
      error=> {
        this.response = error.json().categories.zss.plugins['org.zowe.zlux.auth.zss'].response
        this.responseElem.nativeElement.style.color = '#b70000';

      }
    )
  }
}



/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

