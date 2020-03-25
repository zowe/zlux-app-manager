

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Injector } from '@angular/core';
import { Http, Response } from '@angular/http';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { WindowManagerService } from '../shared/window-manager.service';
import { BaseLogger } from 'virtual-desktop-logger';
import { AuthenticationManager, LoginScreenChangeReason } from '../../../authentication-manager/authentication-manager.service';
import { DesktopWindow } from '../shared/desktop-window';
import { DesktopWindowStateType } from '../shared/desktop-window-state';

@Component({
  selector: 'rs-com-mvd-desktop',
  templateUrl: 'desktop.component.html'
})
export class DesktopComponent {
contextMenuDef: {xPos: number, yPos: number, items: ContextMenuItem[]} | null;
private authenticationManager: MVDHosting.AuthenticationManagerInterface;
public isPersonalizationPanelVisible: boolean;
private needLogin: boolean;
private changePassword: boolean;
private previousOpenWindows: DesktopWindow[];
constructor(
    public windowManager: WindowManagerService,
    private authenticationService: AuthenticationManager,
    private http: Http,
    private injector: Injector
  ) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.contextMenuDef = null;
    this.needLogin = true;
    this.authenticationManager.registerPostLoginAction(new AppDispatcherLoader(this.http));
    this.previousOpenWindows = []
    this.authenticationService.loginScreenVisibilityChanged.subscribe((eventReason: LoginScreenChangeReason) => {
      switch (eventReason) {
      case LoginScreenChangeReason.UserLogout:
        this.needLogin = true;
        this.previousOpenWindows = [];
        break;
      case LoginScreenChangeReason.UserLogin:
        this.needLogin = false;
        this.previousOpenWindows = [];
        break;
      case LoginScreenChangeReason.SessionExpired:
        this.needLogin = true;
        break;
      case LoginScreenChangeReason.PasswordChange:
        this.hideVisibleApplications();
        this.changePassword = true;
        this.hidePersonalizationPanel();
        break;
      case LoginScreenChangeReason.PasswordChangeSuccess:
        const notifTitle = "Account Password";
        const notifMessage = "Password was successfully changed."
        const desktopPluginId = ZoweZLUX.pluginManager.getDesktopPlugin().getIdentifier();
        this.changePassword = false;
        this.hidePersonalizationPanel();
        this.showPreviouslyVisibleApplications();
        ZoweZLUX.notificationManager.notify(ZoweZLUX.notificationManager.createNotification(notifTitle, notifMessage, 1, desktopPluginId));
        break;
      case LoginScreenChangeReason.HidePasswordChange:
        this.changePassword = false;
        this.showPersonalizationPanel();
        this.showPreviouslyVisibleApplications();
        break;
      default:
      }
    });
  }
  ngOnInit(): void {
    this.windowManager.contextMenuRequested.subscribe(menuDef => {
      this.contextMenuDef = menuDef;
    });
  }

  checkLaunchbarVisibility(): boolean {
    return this.needLogin || this.changePassword;
  }

  get isLoggedIn(): boolean {
    return this.authenticationManager.getUsername() != null ? true : false;
  }

  hideVisibleApplications(): void {
    this.previousOpenWindows = [];
    let windows: DesktopWindow[] = this.windowManager.getAllWindows();
    windows.map(window => {
      if (window.windowState.stateType != DesktopWindowStateType.Minimized) {
        this.previousOpenWindows.push(window)
        window.windowState.minimize();
      }
    })
  }

  showPreviouslyVisibleApplications(): void {
    this.previousOpenWindows.map(window => window.windowState.restore());
  }

  showPersonalizationPanel(): void {
    this.isPersonalizationPanelVisible = true;
  }

  hidePersonalizationPanel(): void {
    this.isPersonalizationPanelVisible = false;
  }

  personalizationPanelToggle(): void {
    if (this.isPersonalizationPanelVisible)
    {
      this.isPersonalizationPanelVisible = false;
    } else {
      this.isPersonalizationPanelVisible = true;
    }
  }

  closeContextMenu(): void {
    this.contextMenuDef = null;
  }
}

class AppDispatcherLoader implements MVDHosting.LoginActionInterface {
  private readonly log: ZLUX.ComponentLogger = BaseLogger;
  constructor(private http: Http) { }

  onLogin(username:string, plugins:ZLUX.Plugin[]):boolean {
    let desktop:ZLUX.Plugin = ZoweZLUX.pluginManager.getDesktopPlugin();
    let recognizersUri = ZoweZLUX.uriBroker.pluginConfigUri(desktop,'recognizers');
    let actionsUri = ZoweZLUX.uriBroker.pluginConfigUri(desktop,'actions');
    this.log.debug("ZWED5309I", recognizersUri, actionsUri); //this.log.debug(`Getting recognizers from "${recognizersUri}", actions from "${actionsUri}"`);
    this.http.get(recognizersUri).map((res:Response)=>res.json()).subscribe((config: any)=> {
      if (config) {
        let appContents = config.contents;
        let appsWithRecognizers:string[] = [];
        plugins.forEach((plugin:ZLUX.Plugin)=> {
          let id = plugin.getIdentifier();
          if (appContents[id]) {
            appsWithRecognizers.push(id);
          }
        });
        appsWithRecognizers.forEach(appWithRecognizer=> {
          appContents[appWithRecognizer].recognizers.forEach((recognizerObject:ZLUX.RecognizerObject)=> {
            ZoweZLUX.dispatcher.addRecognizerObject(recognizerObject);
          });
          this.log.info(`ZWED5055I`, appContents[appWithRecognizer].recognizers.length, appWithRecognizer); //this.log.info(`Loaded ${appContents[appWithRecognizer].recognizers.length} recognizers for App(${appWithRecognizer})`);
        });
      }
    });
    this.http.get(actionsUri).map((res:Response)=>res.json()).subscribe((config: any)=> {
      if (config) {
        let appContents = config.contents;
        let appsWithActions:string[] = [];
        plugins.forEach((plugin:ZLUX.Plugin)=> {
          let id = plugin.getIdentifier();
          if (appContents[id]) {
            appsWithActions.push(id);
          }
        });
        appsWithActions.forEach(appWithAction=> {
          appContents[appWithAction].actions.forEach((actionObject:any)=> {
            if (this.isValidAction(actionObject)) {
              ZoweZLUX.dispatcher.registerAbstractAction(ZoweZLUX.dispatcher.makeActionFromObject(actionObject));
            }
          });
          this.log.info(`ZWED5056I`, appContents[appWithAction].actions.length, appWithAction); //this.log.info(`Loaded ${appContents[appWithAction].actions.length} actions for App(${appWithAction})`);
        });
      }
    });
    return true;
  }

  isValidAction(actionObject: any): boolean {
    switch (actionObject.objectType) {
      case 'ActionContainer':
      return actionObject.id && actionObject.defaultName && actionObject.children && actionObject.children.length > 0;

      default:
      const mode: any = ZoweZLUX.dispatcher.constants.ActionTargetMode[actionObject.targetMode];
      const type: any = ZoweZLUX.dispatcher.constants.ActionType[actionObject.type];
      return (actionObject.id && actionObject.defaultName && actionObject.targetId
        && actionObject.arg && mode !== undefined && type !== undefined);
    }
  }
}

window.onbeforeunload = function(e: Event) {
  let dialogText = 'Are you sure you want to navigate away from the Desktop? Apps & Changes will be lost.';
  e.returnValue = false;
  return dialogText;
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

