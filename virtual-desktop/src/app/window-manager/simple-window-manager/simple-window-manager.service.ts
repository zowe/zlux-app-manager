

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector, EventEmitter } from '@angular/core';
// import { DesktopPluginDefinition } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { ViewportManager } from 'app/application-manager/viewport-manager/viewport-manager.service';
import { ContextMenuItem, Angular2InjectionTokens, Angular2PluginViewportEvents, Angular2PluginSessionEvents } from 'pluginlib/inject-resources';
import { BaseLogger } from 'virtual-desktop-logger';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class SimpleWindowManagerService implements MVDWindowManagement.WindowManagerServiceInterface {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private theViewportId: MVDHosting.ViewportId;
  readonly windowResized: EventEmitter<{ width: number, height: number }>;
  private applicationManager: MVDHosting.ApplicationManagerInterface;
  private pluginDef: MVDHosting.DesktopPluginDefinition;
  private authenticationManager: MVDHosting.AuthenticationManagerInterface;

  contextMenuRequested: Subject<{xPos: number, yPos: number, items: ContextMenuItem[]}>;
  private autoSaveInterval : number = 300000;
  public autoSaveFiles : {[key:string]:number} = {};
  public autoSaveFileAllowDelete : boolean = true; 
  public autoSaveDataClean : boolean = false;
  
  constructor(
    private viewportManager: ViewportManager,
    private injector: Injector,
    private http: HttpClient
  ) {
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken)
    this.windowResized = new EventEmitter<{ width: number, height: number }>(true);
    this.contextMenuRequested = new Subject();
    window.addEventListener('resize', () => this.onResize(), false);
  }

  createWindow(plugin: MVDHosting.DesktopPluginDefinition): MVDWindowManagement.WindowId {
    let windowId = 1;
    this.pluginDef = plugin;
    this.theViewportId = this.viewportManager.createViewport((viewportId: MVDHosting.ViewportId)=> {
      return this.generateWindowProviders(windowId, viewportId);
    });
    return windowId;
  }

  createFullscreenStandaloneWindow(plugin: MVDHosting.DesktopPluginDefinition): MVDWindowManagement.WindowId {
    return this.createWindow(plugin);
  }

  getWindow(plugin: MVDHosting.DesktopPluginDefinition): MVDWindowManagement.WindowId | null {
    return 1;
  }

  /* This likely does nothing right now and that's ok since the simple window manager is quite trivial*/
  closeWindow(windowId: MVDWindowManagement.WindowId): void {
    let appId = this.viewportManager.getApplicationInstanceId(this.theViewportId);
    if (appId!=null) {
      this.applicationManager.killApplication(this.pluginDef.getBasePlugin(), appId);
    }
  }

  closeAllWindows(): void {
    //Doing this would leave you with nothing at all, so ignore
    //Also, onLogin logic in authmgr could call this, so if behavior is ever changed keep this in mind.
    //this.closeWindow(1);
  }

  showWindow(windowId: MVDWindowManagement.WindowId): void {
  }

  requestWindowFocus(windowId: MVDWindowManagement.WindowId): boolean {
    return true; //Dummy logic to avoid interface implementation errors for simple window service
  }

  getViewportId(windowId: MVDWindowManagement.WindowId): MVDHosting.ViewportId {
    return this.theViewportId;
  }

  spawnContextMenu(windowId: MVDWindowManagement.WindowId, xRelative: number, yRelative: number, items: ContextMenuItem[]): boolean {
    this.contextMenuRequested.next({xPos: xRelative, yPos: yRelative, items: items});
    return true;
  }
    
  private generateWindowProviders(windowId: MVDWindowManagement.WindowId, viewportId: MVDHosting.ViewportId): Map<string, any> {
    const providers: Map<string, any> = new Map();
    providers.set(Angular2InjectionTokens.VIEWPORT_EVENTS, this.generateViewportEventsProvider(windowId, viewportId));
    providers.set(Angular2InjectionTokens.SESSION_EVENTS, this.generateSessionEventsProvider());

    return providers;
  }

  public launchDesktopAutoSavedApplications(){
    return 1;
  }
  
  private savePluginData(plugin:ZLUX.Plugin,data:any){
    let pathToSave : any = 'pluginData' + '/' + 'singleApp'
    let fileNameToSave : string = plugin.getIdentifier()
    if(this.autoSaveFiles[fileNameToSave] !== undefined){
      this.http.put<any>(ZoweZLUX.uriBroker.pluginConfigUri(ZoweZLUX.pluginManager.getDesktopPlugin(),pathToSave,fileNameToSave+'&lastmod='+this.autoSaveFiles[fileNameToSave]), data).subscribe(res => {
        this.autoSaveFiles[fileNameToSave] = res.maccessms 
        this.logger.info('Saved data for plugin:',plugin.getIdentifier())
      })
    }else{
      this.http.put<any>(ZoweZLUX.uriBroker.pluginConfigUri(ZoweZLUX.pluginManager.getDesktopPlugin(),pathToSave,fileNameToSave), data).subscribe(res => {
        this.autoSaveFiles[fileNameToSave] = res.maccessms 
        this.logger.info('Saved data for plugin:',plugin.getIdentifier())
      })
    }
  };

  private generateSessionEventsProvider(): Angular2PluginSessionEvents {
    const loginSubject = new Subject<void>();
    const sessionExpireSubject = new Subject<void>();
    const autosaveEmitter = new Subject<any>();
    this.authenticationManager.loginScreenVisibilityChanged.subscribe((eventReason: MVDHosting.LoginScreenChangeReason) => {
      switch (eventReason) {
        case MVDHosting.LoginScreenChangeReason.UserLogin:
          loginSubject.next();
          break;
        case MVDHosting.LoginScreenChangeReason.SessionExpired:
          sessionExpireSubject.next();
          break;
      default:
      }
    });
    let plugin: ZLUX.Plugin = this.pluginDef.getBasePlugin();
    if (plugin) {
      setInterval(()=> {
        autosaveEmitter.next((data:any)=> {
          this.savePluginData(plugin,data)
        });
      },this.autoSaveInterval); 
    }
    return {
      login: loginSubject,
      sessionExpire: sessionExpireSubject,
      autosaveEmitter: autosaveEmitter
    };
  }

  private generateViewportEventsProvider(windowId: MVDWindowManagement.WindowId, viewportId: MVDHosting.ViewportId): Angular2PluginViewportEvents {
    return {
      resized: this.windowResized,
      spawnContextMenu: (xRel, yRel, items) => this.spawnContextMenu(windowId, xRel, yRel, items),
      registerCloseHandler: (handler: ()=>Promise<any>) => this.viewportManager.registerViewportCloseHandler(viewportId, handler)
    };
  }

  private onResize() {
    const wh = { width: document.body.clientWidth, height: document.body.clientHeight };
    //this.logger.debug('onresize', JSON.stringify(wh));
    this.windowResized.emit(wh);
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

