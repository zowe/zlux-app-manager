

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
import { ZoweNotification } from 'zlux-base/notification-manager/notification'
import { MatSnackBar} from '@angular/material';
import {SnackbarComponent} from '../shared/snackbar/snackbar.component';
import { LaunchbarItem } from '../shared/launchbar-item';
import { WindowManagerService } from '../../shared/window-manager.service';

@Component({
  selector: 'rs-com-launchbar-widget',
  templateUrl: 'launchbar-widget.component.html',
  styleUrls: [ 'launchbar-widget.component.css' ],
  providers: [LanguageLocaleService]
})
export class LaunchbarWidgetComponent implements MVDHosting.ZoweNotificationWatcher, OnInit {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private readonly plugin: any = ZoweZLUX.pluginManager.getDesktopPlugin();
  private date: Date;
  private popupVisible: boolean;
  @Output() popupStateChanged = new EventEmitter<boolean>();
  @ViewChild('usericon') userIcon: ElementRef;
  @ViewChild('logoutbutton') logoutButton: ElementRef;
  private authenticationManager: MVDHosting.AuthenticationManagerInterface;
  private notificationsVisible: boolean;
  messageCount: number;
  private info: any[];
  @Input() menuItems: LaunchbarItem[];
  public closeImage: string = require('../../../../../assets/images/window/close-normal.png')
  private applicationManager: MVDHosting.ApplicationManagerInterface;

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
    this.messageCount = 0;
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
    //this.activeToggle();
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

  get allNotifications(): ZoweNotification[] {
    return ZoweZLUX.notificationManager.getAll()
  }

  handleMessageAdded(data: any, index: number): void {
    this.info = this.parseInfo()
    this.messageCount = ZoweZLUX.notificationManager.getCount();
    let ref = this.snackBar.openFromComponent(SnackbarComponent, {data: this.info[0], duration: 5000})
    ref.onAction().subscribe(() => {
      ZoweZLUX.notificationManager.removeFromCache(index)
      this.info = this.parseInfo()
      this.messageCount = ZoweZLUX.notificationManager.getCount();
    });
  }

  parseInfo(): any[] {
    let notifications = ZoweZLUX.notificationManager.getAll()
    let info: any[] = [];

    for (let notification of notifications) {
      let imgSrc = ""
      for(let item of this.menuItems) {
        if (item.plugin.getBasePlugin().getIdentifier() === notification.plugin) {
          imgSrc = item.image || ""
        }
      }
      if (imgSrc === "") {
        imgSrc =  require('../../../../../assets/images/launchbar/notifications/zowe.png')
      }

      let currentDate = new Date();
      let notificationTime = notification.date.split('T')[1].split('.')[0]
      let currentTime = currentDate.toUTCString().split(' ')[4]


      // This logic is wrong but kinda works, if one minute changes then all the minutes change 
      // Need to also do logic about if more than a day
      let hourDifference = parseInt(currentTime.split(':')[0]) - parseInt(notificationTime.split(':')[0])
      let minuteDifference = parseInt(currentTime.split(':')[1]) - parseInt(notificationTime.split(':')[1])
      let timeSince: string;
      if (hourDifference > 0) {
        timeSince = hourDifference + " hours ago"
      } else if (minuteDifference > 0) {
        timeSince = minuteDifference + " minutes ago"
      } else {
        timeSince = "Less than a minute ago"
      }
      
      info.push({'title': notification.title, 'message': notification.message, 'timeSince': timeSince, "imgSrc": imgSrc})
    }

    return info
  }

  deleteNotification(item: any) {
    let index = ZoweZLUX.notificationManager.getCount() - item - 1
    ZoweZLUX.notificationManager.removeFromCache(index)
    this.messageCount = ZoweZLUX.notificationManager.getCount();
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

