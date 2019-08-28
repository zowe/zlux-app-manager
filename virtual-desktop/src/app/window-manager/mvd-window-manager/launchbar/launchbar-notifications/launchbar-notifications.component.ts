/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/


import { ZoweNotification } from '../../../../../../../../zlux-platform/base/src/notification-manager/notification'
import { Component, OnInit } from '@angular/core';
// import { SnackBarService } from '../../services/snack-bar.service';
// import { BaseLogger } from 'virtual-desktop-logger';
import { MatSnackBar} from '@angular/material';

@Component({
  selector: 'rs-com-launchbar-notifications',
  templateUrl: 'launchbar-notifications.component.html',
  styleUrls: [ 'launchbar-notifications.component.css' ]
})
export class LaunchbarNotificationsComponent implements MVDHosting.ZoweNotificationWatcher, OnInit {
  public messageCount: any;
  public shown: boolean;

  constructor(
    // private snackBar: SnackBarService,
    private testBar: MatSnackBar
    // @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    // @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger
    ) {
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
    console.log(data)
    console.log(ZoweZLUX.zoweNotificationManager.getCount())
    this.messageCount = ZoweZLUX.zoweNotificationManager.getCount();
    // this.snackBar.open(data['from'] + ': ' + data['message'], 'Dismiss', {duration: 5000, panelClass: 'myapp-no-padding-dialog'});
    let ref = this.testBar.open(data['from'] + ': ' + data['notification']['message'], 'Dismiss', {duration: 5000, panelClass: 'myapp-no-padding-dialog'});
    ref.onAction().subscribe(() => {
      ZoweZLUX.zoweNotificationManager.removeFromCache(index)
      this.messageCount = ZoweZLUX.zoweNotificationManager.getCount();
      // this.clicked = true;
      console.log('The snack-bar action was triggered!');
    });
    ref.afterDismissed().subscribe(() => {
      console.log('yeet yeet yott')
    })
    console.log(ZoweZLUX.zoweNotificationManager.getAll())
  }

  buttonClicked(event: any): void {
    // let test = new ZoweNotification("test", 1,"org.zowe.zlux.bootstrap")
    // ZoweZLUX.zoweNotificationManager.push(test)
    ZoweZLUX.zoweNotificationManager.test();
    this.shown = !this.shown
  }

  deleteNotification(event: any, item: any) {
    console.log(event)
    console.log(item)
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
