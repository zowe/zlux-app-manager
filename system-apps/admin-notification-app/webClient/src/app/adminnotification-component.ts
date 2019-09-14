
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, Inject } from '@angular/core';
import {Http} from '@angular/http';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { ZoweNotification } from '../../../../../../zlux-platform/base/src/notification-manager/notification'
const EVERYONE = "Everyone";
const INDIVIDUAL = "Individual";

@Component({
  selector: 'adminnotification',
  templateUrl: 'adminnotification-component.html',
  styleUrls: ['adminnotification-component.scss']
})

export class AdminNotificationComponent {
  private response: string;
  private items: any;
  private recipient: string;
  private displayText: boolean;
  
  constructor(private http: Http,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    ) {
    this.response = "";
    this.items = [{content: EVERYONE}, {content: INDIVIDUAL}]
    this.recipient = EVERYONE
    this.displayText = true;
  }

  selected(e: any): void {
    this.recipient = e.item.content
    if (e.item.content === EVERYONE) {
      this.recipient = e.item.content
      this.displayText = true;
    } else if (e.item.content === INDIVIDUAL) {
      this.recipient = ""
      this.displayText = false;
    }
  }

  sendRest(title: string, message: string): void {
    let notification = new ZoweNotification(title, message, 1, "org.zowe.zlux.bootstrap")

    ZoweZLUX.pluginManager.loadPlugins('bootstrap').then((res: any) => {
      if (this.recipient === EVERYONE) {
        ZoweZLUX.notificationManager.serverNotify({"notification": notification, "recipient": EVERYONE})
        .then(
          (res: any) => {
            res.json().then((json: any) => this.response = "Server Response: " + json.Response)
          },
          (error: any) => {
            error.json().then((json: any) => this.response = "Server Response: " + json.Response)
          })
      } else {
        ZoweZLUX.notificationManager.serverNotify({"username": this.recipient, "notification": notification, "recipient": INDIVIDUAL})
        .then(
          (res: any) => {
            res.json().then((json: any) => this.response = "Server Response: " + json.Response)
          },
          (error: any) => {
            error.json().then((json: any) => this.response = "Server Response: " + json.Response)
          })
      }
    })
  }
}



/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

