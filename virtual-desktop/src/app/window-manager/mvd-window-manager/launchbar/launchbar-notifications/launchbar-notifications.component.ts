/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/


import { ZoweNotification } from 'zlux-base/notification-manager/notification'
import { Component, OnInit } from '@angular/core';

import { MatSnackBar} from '@angular/material';

@Component({
  selector: 'rs-com-launchbar-notifications',
  templateUrl: 'launchbar-notifications.component.html',
  styleUrls: [ 'launchbar-notifications.component.css' ]
})
export class LaunchbarNotificationsComponent implements MVDHosting.ZoweNotificationWatcher, OnInit {
  public messageCount: any;
  public shown: boolean;

  constructor(private testBar: MatSnackBar) {
    this.messageCount = 0;
    this.shown = true;
    ZoweZLUX.zoweNotificationManager.addMessageHandler(this);
  }

  ngOnInit() {

  }

  handleMessageAdded(): void {
    this.messageCount = ZoweZLUX.zoweNotificationManager.getCount();
  }

  handleMessageAddedTest(data: any, index: number): void {
    this.messageCount = ZoweZLUX.zoweNotificationManager.getCount();
    let ref = this.testBar.open(data['from'] + ': ' + data['notification']['message'], 'Dismiss', {duration: 5000, panelClass: 'myapp-no-padding-dialog'});
    ref.onAction().subscribe(() => {
      ZoweZLUX.zoweNotificationManager.removeFromCache(index)
      this.messageCount = ZoweZLUX.zoweNotificationManager.getCount();
    });
  }

  buttonClicked(event: any): void {
    ZoweZLUX.zoweNotificationManager.test();
    this.shown = !this.shown
  }

  deleteNotification(event: any, item: any) {
    let index = ZoweZLUX.zoweNotificationManager.getCount() - item - 1
    ZoweZLUX.zoweNotificationManager.removeFromCache(index)
    this.messageCount = ZoweZLUX.zoweNotificationManager.getCount();
  }

  get allNotifications(): ZoweNotification[] {
    return ZoweZLUX.zoweNotificationManager.getAll()
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
