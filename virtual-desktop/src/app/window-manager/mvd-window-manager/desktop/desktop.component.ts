

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, Inject } from '@angular/core';
import { Http, Response } from '@angular/http';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { WindowManagerService } from '../shared/window-manager.service';

@Component({
  selector: 'rs-com-mvd-desktop',
  templateUrl: 'desktop.component.html'
})
export class DesktopComponent {
contextMenuDef: {xPos: number, yPos: number, items: ContextMenuItem[]} | null;

constructor(
    public windowManager: WindowManagerService,
    private http: Http,
    @Inject(MVDHosting.Tokens.AuthenticationManagerToken) private authenticationManager: MVDHosting.AuthenticationManagerInterface
  ) {
    this.contextMenuDef = null;
    this.authenticationManager.registerPostLoginAction(new AppDispatcherLoader(this.http));
  }
  ngOnInit(): void {
    this.windowManager.contextMenuRequested.subscribe(menuDef => {
      this.contextMenuDef = menuDef;
    });
  }

  closeContextMenu(): void {
    this.contextMenuDef = null;
  }
}

class AppDispatcherLoader implements MVDHosting.LoginActionInterface {
  private log:ZLUX.ComponentLogger;
  constructor(private http: Http) {
    //A small hack due to not being able to use the injection logger this early
    this.log = RocketMVD.logger.makeComponentLogger('com.rs.mvd.ng2desktop');
  }
  
  onLogin(username:string, plugins:ZLUX.Plugin[]):boolean {
    let desktop:ZLUX.Plugin = RocketMVD.PluginManager.getDesktopPlugin();
    let recognizersUri = RocketMVD.uriBroker.pluginConfigUri(desktop,'recognizers');
    let actionsUri = RocketMVD.uriBroker.pluginConfigUri(desktop,'actions');
    this.log.debug(`Getting recognizers from "${recognizersUri}", actions from "${actionsUri}"`);
    this.http.get(recognizersUri).map((res:Response)=>res.json()).subscribe((config: any)=> {
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
          RocketMVD.dispatcher.addRecognizerFromObject(recognizerObject.clause,recognizerObject.id); 
        });
        this.log.info(`Loaded ${appContents[appWithRecognizer].recognizers.length} recognizers for App(${appWithRecognizer})`);
      });
    });
    this.http.get(actionsUri).map((res:Response)=>res.json()).subscribe((config: any)=> {
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
          let mode: any = RocketMVD.dispatcher.constants.ActionTargetMode[actionObject.targetMode];
          let type: any = RocketMVD.dispatcher.constants.ActionType[actionObject.type];
          if (actionObject.id && actionObject.defaultName && actionObject.targetId && actionObject.arg && mode !== undefined && type !== undefined) {
            RocketMVD.dispatcher.registerAction(RocketMVD.dispatcher.makeAction(actionObject.id, actionObject.defaultName, (mode as ZLUX.ActionTargetMode), (type as ZLUX.ActionType), actionObject.targetId, actionObject.arg));
          }
        });
        this.log.info(`Loaded ${appContents[appWithAction].actions.length} actions for App(${appWithAction})`);
      });      
    });
    return true;
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

