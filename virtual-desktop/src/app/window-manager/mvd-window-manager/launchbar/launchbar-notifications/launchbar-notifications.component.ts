

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

// import { Component, OnInit } from '@angular/core';

// import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
// import { ZoweNotificationManager } from '../../../../../../../../zlux-platform/base/src/notification-manager/notification-manager'
import { ZoweNotification } from '../../../../../../../../zlux-platform/base/src/notification-manager/notification'
import { Component, OnInit } from '@angular/core';
import { SnackBarService } from '../../services/snack-bar.service';

// import { BaseLogger } from 'virtual-desktop-logger';

// import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

@Component({
  selector: 'rs-com-launchbar-notifications',
  templateUrl: 'launchbar-notifications.component.html',
  styleUrls: [ 'launchbar-notifications.component.css', '../../services/snack-bar-style.css' ]
})
export class LaunchbarNotificationsComponent implements MVDHosting.ZoweNotificationWatcher, OnInit {
  public messageCount: any;
  // private ws: WebSocket;
  // private log: ZLUX.ComponentLogger;

  constructor(
    private snackBar: SnackBarService
    // @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,

    // @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger
    ) {
    this.messageCount = 0;
    ZoweZLUX.zoweNotificationManager.addMessageHandler(this);
    console.log("yeeeeeeeeeeeet")
    // this.log = BaseLogger.makeSublogger("notification")
    // console.log(this.log)
    // console.log(Angular2InjectionTokens.PLUGIN_DEFINITION)
    // console.log(ZoweZLUX.uriBroker.pluginWSUri(plugin, 'adminnotificationdata', ''))
    /* If the server needs to send a message, we use the websocket,
    else, an application will just call handleMessageAdded handleMessageAdded
    the notificationCount will be updated in real time */
    // const myHost = window.location.host;
    // const protocol = window.location.protocol;
    // const wsProtocol = (protocol === 'https:') ? 'wss:' : 'ws:';
    // let computedURL:string = `${wsProtocol}//${myHost}/plugins/com.rs.zlux.notification.websocket/services/notificationsdata/`;
    // this.ws = new WebSocket(computedURL);
    // this.log.info("WebSocket created");
    // this.messageCount = 0
    // ZoweZLUX.zoweNotificationManager.getCountTest();
  }

  ngOnInit() {
    // this.ws.onmessage = function (event) {
    //   console.log("test")
    //   // Do something?
    // }

    // this.ws.onerror = function (event) {
    //   this.close();
    // }
  }

  handleMessageAdded(): void {
    console.log("ya yeet")
    this.messageCount = ZoweZLUX.zoweNotificationManager.getCount();
  }

  handleMessageAddedTest(data: any): void {
    console.log("ya yeet")
    this.messageCount = data['count'];
    this.snackBar.open(data['message'], 'Dismiss', {duration: 5000, panelClass: 'myapp-no-padding-dialog'});

  }

  buttonClicked(event: any): void {
    console.log(window.location.host)
    console.log(window.location.protocol)
    // console.log(ZoweZLUX.uriBroker.pluginWSUri("org.zowe.zlux.bootstrap", 'adminnotificationdata', ''))
    let test = new ZoweNotification("test", 1,"org.zowe.zlux.bootstrap")
    ZoweZLUX.zoweNotificationManager.push(test)
    // console.log(ZoweZLUX.zoweNotificationManager.getAll())
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
