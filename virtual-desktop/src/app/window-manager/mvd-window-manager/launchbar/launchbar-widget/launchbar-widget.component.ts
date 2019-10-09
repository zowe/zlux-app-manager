

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Injector,
  OnInit,
  Output,
  ViewChild,
  Input
  } from '@angular/core';
import { Observable } from 'rxjs/Rx';
import { DesktopComponent } from "../../desktop/desktop.component";
import { LanguageLocaleService } from '../../../../i18n/language-locale.service';
import { BaseLogger } from '../../../../shared/logger';
import { MatSnackBar} from '@angular/material';
import {SnackbarComponent} from '../shared/snackbar/snackbar.component';
import { LaunchbarItem } from '../shared/launchbar-item';
import { WindowManagerService } from '../../shared/window-manager.service';

@Component({
  selector: 'rs-com-launchbar-widget',
  templateUrl: 'launchbar-widget.component.html',
  styleUrls: [ 'launchbar-widget.component.css', '../shared/shared.css' ],
  providers: [LanguageLocaleService],
})
export class LaunchbarWidgetComponent implements MVDHosting.ZoweNotificationWatcher, OnInit {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private readonly plugin: any = ZoweZLUX.pluginManager.getDesktopPlugin();
  public date: Date;
  public popupVisible: boolean;
  @Output() popupStateChanged = new EventEmitter<boolean>();
  @ViewChild('usericon') userIcon: ElementRef;
  @ViewChild('logoutbutton') logoutButton: ElementRef;
  private authenticationManager: MVDHosting.AuthenticationManagerInterface;
  public notificationsVisible: boolean;
  private info: any[];
  @Input() menuItems: LaunchbarItem[];
  public closeImage: string = require('../../../../../assets/images/window/close-normal.png')
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  public notifications: any[];
  // Convenience widgets for testing the i18n work
  // @ViewChild('languagebutton') languageButton: ElementRef;
  // @ViewChild('clearlanguagebutton') clearLanguageButton: ElementRef;
  // @ViewChild('localebutton') localeButton: ElementRef;

  constructor(
    private injector: Injector,
    private languageLocaleService: LanguageLocaleService,
    private desktopComponent: DesktopComponent,
    private snackBar: MatSnackBar,
    public windowManager: WindowManagerService,
  ) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
    this.date = new Date();
    this.popupVisible = false;
    this.notificationsVisible = false;
    this.notifications = [];
    ZoweZLUX.notificationManager.addMessageHandler(this);
  }

  ngOnInit(): void {
    this.date = new Date();

    Observable.interval(1000).subscribe(() => this.date = new Date());
  }

  getUsername(): string | null {
    return this.authenticationManager.getUsername();
  }

  getPluginVersion(): string | null {
    return "v. " + this.plugin.version;
  }

  logout(): void {
    this.notifications.length = 0
    this.popupVisible = false;
    this.popupStateChanged.emit(this.popupVisible);
    this.authenticationManager.requestLogout();
  }

  togglePopup(): void {
    this.popupVisible = !this.popupVisible;
    this.popupStateChanged.emit(this.popupVisible);
  }

  toggleNotifications(): void {
    this.notificationsVisible = !this.notificationsVisible;
  }

  togglePersonalizationPanel() {
    this.desktopComponent.personalizationPanelToggle();
  }

  @HostListener('document:mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (this.popupVisible && event
        && !this.userIcon.nativeElement.contains(event.target)
        && this.logoutButton.nativeElement !== event.target
        // Convenience widgets for testing the i18n work
        // && this.languageButton.nativeElement !== event.target
        // && this.clearLanguageButton.nativeElement !== event.target
        // && this.localeButton.nativeElement !== event.target
      ) {
      this.popupVisible = false;
      this.popupStateChanged.emit(this.popupVisible);
    }
  }

  setLanguage(value: string): void {
    this.languageLocaleService.setLanguage(value).subscribe(
      arg => this.logger.debug(`setLanguage, arg=`,arg),
      err => {
        this.logger.warn("setLanguage error=",err);
      }
    )
  }

  setLocale(value: string): void {
    this.languageLocaleService.setLocale('US').subscribe(arg => this.logger.debug(`setLocale, arg=`,arg))
  }

  handleMessageAdded(message: any): void {
    this.notifications.unshift(message)
    this.info = this.parseInfo()
    let styleClass = "org_zowe_zlux_ng2desktop_snackbar";
    if (message.notification.styleClass) {
      styleClass = message.notification.styleClass;
    }
    let ref = this.snackBar.openFromComponent(SnackbarComponent, {data: this.info[0], duration: 5000, panelClass: styleClass, verticalPosition: 'top', horizontalPosition: 'end'})
    ref.onAction().subscribe(() => {
      ZoweZLUX.notificationManager.dismissNotification(message.id)
      this.info = this.parseInfo()
    });
  }

  handleMessageRemoved(id: number): void {
    this.notifications.splice(this.notifications.findIndex(x => x.id === id), 1)
  }

  parseInfo(): any[] {
    let info: any[] = [];

    for (let notification of this.notifications) {
      let imgSrc = ""
      for(let item of this.menuItems) {
        if (item.plugin.getBasePlugin().getIdentifier() === notification['notification'].plugin) {
          imgSrc = item.image || ""
        }
      }
      if (imgSrc === "") {
        imgSrc =  require('../../../../../assets/images/launchbar/notifications/zowe.png')
      }
//      let currentDate = new Date();
//      let notificationTime = notification['notification'].date.toString().split('T')[1].split('.')[0]
//      let currentTime = currentDate.toUTCString().split(' ')[4]


      // This logic is wrong but kinda works, if one minute changes then all the minutes change 
      // Need to also do logic about if more than a day
//      let hourDifference = parseInt(currentTime.split(':')[0]) - parseInt(notificationTime.split(':')[0])
//      let minuteDifference = parseInt(currentTime.split(':')[1]) - parseInt(notificationTime.split(':')[1])
//      let timeSince: string;
//      if (hourDifference > 0) {
//        timeSince = hourDifference + " hours ago"
//      } else if (minuteDifference > 0) {
//        timeSince = minuteDifference + " minutes ago"
//      } else {
//        timeSince = "Less than a minute ago"
//      }
      
      info.push({'title': notification['notification'].title, 'message': notification['notification'].message, 'timeSince': 'timeSince', "imgSrc": imgSrc})
    }

    return info
  }

  deleteNotification(item: any) {
    ZoweZLUX.notificationManager.dismissNotification(item.id)
    this.info = this.parseInfo();
  }

  focusApplication(item: any) {
    let pluginId = ZoweZLUX.notificationManager.getAll()[item].plugin

    for(let item of this.menuItems) {
      if (item.plugin.getBasePlugin().getIdentifier() === pluginId) {
        let windowIds = this.windowManager.getWindowIDs(item.plugin)
        if (windowIds != null){
          if (windowIds.length > 0) {
            this.windowManager.requestWindowFocus(windowIds[0])
          } else {
            this.applicationManager.showApplicationWindow(item.plugin);
          }
        }
      }
    }
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

