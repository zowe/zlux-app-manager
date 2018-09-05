

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, Inject } from '@angular/core';

import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

@Component({
  selector: 'rs-com-launchbar-notifications',
  templateUrl: 'launchbar-notifications.component.html',
  styleUrls: [ 'launchbar-notifications.component.css' ]
})
export class LaunchbarNotificationsComponent implements MVDHosting.NotificationWatcher, OnInit {
  private nCount: number;
  private ws: WebSocket;
  
  constructor(@Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger) {
    this.nCount = 0;
    window.RocketMVD.NotificationManager.addMessageHandler(this);

    /* If the server needs to send a message, we use the websocket,
    else, an application will just call handleMessageAdded handleMessageAdded
    the notificationCount will be updated in real time */
    const myHost = window.location.host;
    const protocol = window.location.protocol;
    const wsProtocol = (protocol === 'https:') ? 'wss:' : 'ws:';
    let computedURL:string = `${wsProtocol}//${myHost}/plugins/com.rs.zlux.notification.websocket/services/notificationsdata/`;
    this.ws = new WebSocket(computedURL);
    this.log.info("WebSocket created");
  }

  ngOnInit() {
    this.ws.onmessage = function (event) {
      // Do something?
    }

    this.ws.onerror = function (event) {
      this.close();
    }
  }

  handleMessageAdded(): void {
    this.nCount = window.RocketMVD.NotificationManager.getCount();
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

