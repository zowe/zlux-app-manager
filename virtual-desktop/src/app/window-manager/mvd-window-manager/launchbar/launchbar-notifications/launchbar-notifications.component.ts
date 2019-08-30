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
// import { flattenStyles } from '@angular/platform-browser/src/dom/dom_renderer';

@Component({
  selector: 'rs-com-launchbar-notifications',
  templateUrl: 'launchbar-notifications.component.html',
  styleUrls: [ 'launchbar-notifications.component.css' ]
})
export class LaunchbarNotificationsComponent implements MVDHosting.ZoweNotificationWatcher, OnInit {
  public messageCount: any;
  public shown: boolean;
  public image: string = require('../../../../../assets/images/launchbar/notifications/zowe.png');
  public notificationImage: string = require('../../../../../assets/images/launchbar/notifications/notification.png');
  public notificationImageExists: string = require('../../../../../assets/images/launchbar/notifications/notification-exists.png');
  public closeImage: string = require('../../../../../assets/images/window/close-normal.png')
  public info: any[];
  public single: boolean;
  public double: boolean;

  constructor(private testBar: MatSnackBar) {
    this.messageCount = 0;
    this.single = false;
    this.double = false;
    this.shown = true;
    ZoweZLUX.zoweNotificationManager.addMessageHandler(this);
  }

  ngOnInit() {

  }

  // handleMessageAdded(): void {
  //   this.messageCount = ZoweZLUX.zoweNotificationManager.getCount();
  // }

  handleMessageAdded(data: any, index: number): void {
    console.log(this.parseInfo())
    this.info = this.parseInfo()
    this.messageCount = ZoweZLUX.zoweNotificationManager.getCount();
    let ref = this.testBar.open(data['from'] + ': ' + data['notification']['message'], 'Dismiss', {duration: 5000, panelClass: 'myapp-no-padding-dialog'});
    ref.onAction().subscribe(() => {
      ZoweZLUX.zoweNotificationManager.removeFromCache(index)
      this.messageCount = ZoweZLUX.zoweNotificationManager.getCount();
    });
  }

  buttonClicked(event: any): void {
    this.shown = !this.shown
  }

  deleteNotification(event: any, item: any) {
    let index = ZoweZLUX.zoweNotificationManager.getCount() - item - 1
    ZoweZLUX.zoweNotificationManager.removeFromCache(index)
    this.messageCount = ZoweZLUX.zoweNotificationManager.getCount();
  }

  get allNotifications(): ZoweNotification[] {
    // console.log(ZoweZLUX.zoweNotificationManager.getAll())
    if (this.messageCount >= 10) {
      this.double = true
    } else {
      this.double = false
    }
    if (10 > this.messageCount && this.messageCount > 0) {
      this.single = true;
    } else {
      this.single = false;
    }
    return ZoweZLUX.zoweNotificationManager.getAll()
  }

  parseInfo(): any[] {
    let notifications = ZoweZLUX.zoweNotificationManager.getAll()
    let info: any[] = [];

    for (let notification of notifications) {
      let currentDate = new Date();
      let notificationTime = notification.date.split('T')[1].split('.')[0]
      let currentTime = currentDate.toUTCString().split(' ')[4]


      // This logic is wrong but kinda works, if one minute changes then all the minutes change 
      // Need to also do logic about if more than a day
      let hourDifference = parseInt(currentTime.split(':')[0]) - parseInt(notificationTime.split(':')[0])
      let minuteDifference = parseInt(currentTime.split(':')[1]) - parseInt(notificationTime.split(':')[1])
      // let secondDifference = parseInt(currentTime.split(':')[2]) - parseInt(notificationTime.split(':')[2])
      let timeSince: string;
      if (hourDifference > 0) {
        timeSince = hourDifference + " hours ago"
      } else if (minuteDifference > 0) {
        timeSince = minuteDifference + " minutes ago"
      } else {
        timeSince = "Less than a minute ago"
      }
      
      info.push({'title': notification.title, 'message': notification.message, 'timeSince': timeSince})
    }

    return info
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
