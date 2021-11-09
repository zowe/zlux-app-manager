

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { WindowManagerService } from '../shared/window-manager.service';
import { BaseLogger } from 'virtual-desktop-logger';
import { AuthenticationManager } from '../../../authentication-manager/authentication-manager.service';
import { L10nTranslationService } from 'angular-l10n';
import { Colors } from '../shared/colors';

const ACCOUNT_PASSWORD = "Account Password";
const PASSWORD_CHANGED = "PasswordChanged"
const ENABLE_PLUGINS_ADDED_TIMEOUT = 1000;

@Component({
  selector: 'rs-com-mvd-desktop',
  templateUrl: 'desktop.component.html'
})
export class DesktopComponent implements MVDHosting.LoginActionInterface {
  contextMenuDef: {xPos: number, yPos: number, items: ContextMenuItem[]} | null;
  private authenticationManager: MVDHosting.AuthenticationManagerInterface;
  public isPersonalizationPanelVisible: boolean;
  private readonly log: ZLUX.ComponentLogger = BaseLogger;

  /* Default theme is a dark grey, with white text, on medium size desktop */
  public _theme: DesktopTheme = {
    color: {
      windowTextActive: '#f4f4f4',
      windowTextInactive: '#828282',
      windowColorActive: Colors.COOLGREY_80,
      windowColorInactive: Colors.COOLGREY_90,
      launchbarText: Colors.COOLGREY_20,
      launchbarColor: '#0d0d0eb2',
      launchbarMenuText: Colors.COOLGREY_20,
      launchbarMenuColor: Colors.COOLGREY_90
    },
    size: {
      window: 2,
      launchbar: 2,
      launchbarMenu: 2
    }
  }
  
  constructor(
    public windowManager: WindowManagerService,
    private authenticationService: AuthenticationManager,
    private http: HttpClient,
    private injector: Injector,
    private translation: L10nTranslationService
  ) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.contextMenuDef = null;
    this.authenticationManager.registerPostLoginAction(this);
    this.authenticationManager.registerPostLoginAction(new AppDispatcherLoader(this.http, this.injector));
    this.authenticationService.loginScreenVisibilityChanged.subscribe((eventReason: MVDHosting.LoginScreenChangeReason) => {
      switch (eventReason) {
      case MVDHosting.LoginScreenChangeReason.PasswordChangeSuccess:
        const notifTitle = this.translation.translate(ACCOUNT_PASSWORD);
        const notifMessage = this.translation.translate(PASSWORD_CHANGED);
        const desktopPluginId = ZoweZLUX.pluginManager.getDesktopPlugin().getIdentifier();
        this.hidePersonalizationPanel();
        ZoweZLUX.notificationManager.notify(ZoweZLUX.notificationManager.createNotification(notifTitle, notifMessage, 1, desktopPluginId));
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

  onLogin(username:string, plugins: ZLUX.Plugin[]): boolean {
    // When the user logs in, we attempt to retrieve their theme settings from the configuration dataservice
    this.http.get(ZoweZLUX.uriBroker.pluginConfigUri(ZoweZLUX.pluginManager.getDesktopPlugin(), 'ui/theme', 'config.json')).subscribe((data: any) => {
      if (data) {
        this.log.debug('Desktop config=',data.contents);
        if (Object.keys(data.contents).length !== 0) { //If the retrived theme became blank, we don't replace existing one with a corrupt object
          this._theme = (data.contents as DesktopTheme);
        }
      } else {
        this.log.debug('No Desktop config found. Using defaults.');
      }
    });
    return true;
  }

  setTheme(newTheme: DesktopTheme) {
    this.log.debug('Req to change to =', newTheme);
    this._theme = Object.assign({}, newTheme);
    this.http.put<DesktopTheme>(ZoweZLUX.uriBroker.pluginConfigUri(ZoweZLUX.pluginManager.getDesktopPlugin(), 'ui/theme', 'config.json'), this._theme).subscribe((data: any) => { this.log.info(`Theme saved.`) });
  }

  previewTheme(newTheme: DesktopTheme) {
    this.log.debug('Previewing (not saved yet) to =', newTheme);
    this._theme = Object.assign({}, newTheme);
  }

  getTheme() {
    return this._theme;
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

export type DesktopTheme = {
  color: {
    windowTextActive: string;
    windowTextInactive: string;
    windowColorActive: string;
    windowColorInactive: string;
    launchbarText: string;
    launchbarColor: string;
    launchbarMenuColor: string;
    launchbarMenuText: string;
  }
  size: {
    window: number;
    launchbar: number;
    launchbarMenu: number;
  }
}

class AppDispatcherLoader implements MVDHosting.LoginActionInterface {
  private readonly log: ZLUX.ComponentLogger = BaseLogger;
  private pluginManager: MVDHosting.PluginManagerInterface;
  static enablePluginsAddedSubscribe: boolean;
  constructor(
    private http: HttpClient,
    private injector: Injector) {
    this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
    AppDispatcherLoader.enablePluginsAddedSubscribe = false;
    this.pluginManager.pluginsAdded.subscribe((plugins: ZLUX.Plugin[])=> {
      if (AppDispatcherLoader.enablePluginsAddedSubscribe) {
        this.getAndDispatchRecognizers(plugins);
        this.getAndDispatchActions(plugins);
      }
    });
   }

  onLogin(username:string, plugins:ZLUX.Plugin[]):boolean {
    this.getAndDispatchRecognizers(plugins);
    this.getAndDispatchActions(plugins);
    // To not double-load recognizers & actions, we enable pluginsAdded subscribe after 1 second
    setTimeout(() => { AppDispatcherLoader.enablePluginsAddedSubscribe = true; }, ENABLE_PLUGINS_ADDED_TIMEOUT);
    return true;
  }

  getAndDispatchRecognizers(plugins: ZLUX.Plugin[]) {
    let desktop:ZLUX.Plugin = ZoweZLUX.pluginManager.getDesktopPlugin();
    let recognizersUri = ZoweZLUX.uriBroker.pluginConfigUri(desktop,'recognizers');
    this.log.debug(`Getting recognizers from "${recognizersUri}"`);
    this.http.get(recognizersUri).subscribe((config: any)=> {
      if (config && config.contents) {
        let appContents = config.contents;
        plugins.forEach((plugin:ZLUX.Plugin)=> {
          const id = plugin.getIdentifier();
          if (appContents[id] && appContents[id].recognizers) { // If config has pre-existing recognizers for this plugin id,
            appContents[id].recognizers.forEach((recognizerObject: any)=> {
              ZoweZLUX.dispatcher.addRecognizerObject(recognizerObject); // register each object with the Dispatcher.
            });
            this.log.info(`ZWED5055I`, appContents[id].recognizers.length, id); //this.log.info(`Loaded ${appContents[id].recognizers.length} recognizers for App(${id})`);    
          }
        });
      }
    });
  }

  getAndDispatchActions(plugins: ZLUX.Plugin[]) {
    let desktop:ZLUX.Plugin = ZoweZLUX.pluginManager.getDesktopPlugin();
    let actionsUri = ZoweZLUX.uriBroker.pluginConfigUri(desktop,'actions');
    this.log.debug(`Getting actions from "${actionsUri}"`);
    this.http.get(actionsUri).subscribe((config: any)=> {
      if (config && config.contents) {
        let appContents = config.contents;
        plugins.forEach((plugin:ZLUX.Plugin)=> {
          const id = plugin.getIdentifier();
          if (appContents[id] && appContents[id].actions) { // If config has pre-existing actions for this plugin id,
            appContents[id].actions.forEach((actionObject: any)=> {
              if (this.isValidAction(actionObject)) {
                ZoweZLUX.dispatcher.registerAbstractAction(ZoweZLUX.dispatcher.makeActionFromObject(actionObject));
              }
            });
            this.log.info(`ZWED5056I`, appContents[id].actions.length, id); //this.log.info(`Loaded ${appContents[id].actions.length} actions for App(${id})`);
          }
        });
      }
    });
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

