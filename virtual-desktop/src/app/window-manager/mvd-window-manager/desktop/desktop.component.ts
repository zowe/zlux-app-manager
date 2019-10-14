

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

@Component({
  selector: 'rs-com-mvd-desktop',
  templateUrl: 'desktop.component.html'
})
export class DesktopComponent {
contextMenuDef: {xPos: number, yPos: number, items: ContextMenuItem[]} | null;
private authenticationManager: MVDHosting.AuthenticationManagerInterface;
public isPersonalizationPanelVisible: boolean;
constructor(
    public windowManager: WindowManagerService,
    private http: Http,
    private injector: Injector
  ) {
    // Workaround for AoT problem with namespaces (see angular/angular#15613)
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.contextMenuDef = null;
    this.authenticationManager.registerPostLoginAction(new AppDispatcherLoader(this.http));
  }
  ngOnInit(): void {
    this.windowManager.contextMenuRequested.subscribe(menuDef => {
      this.contextMenuDef = menuDef;
    });
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
    this.log.debug(`Getting recognizers from "${recognizersUri}", actions from "${actionsUri}"`);
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
          this.log.info(`Loaded ${appContents[appWithRecognizer].recognizers.length} recognizers for App(${appWithRecognizer})`);
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
          this.log.info(`Loaded ${appContents[appWithAction].actions.length} actions for App(${appWithAction})`);
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

