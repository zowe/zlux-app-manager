

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, Injector, Input, ViewChildren, ElementRef, QueryList } from '@angular/core';
import { LinkComponent } from '../link/link.component';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { DesktopTheme } from "../desktop/desktop.component";
import { HttpClient, HttpResponse } from '@angular/common/http';
import { DesktopWindow } from '../shared/desktop-window';
import { WindowManagerService } from '../shared/window-manager.service';
import { BaseLogger } from 'virtual-desktop-logger';
import { ThemeEmitterService } from '../services/theme-emitter.service';
import { TranslationService } from 'angular-l10n';

//TODO this is not made for window-pane use, fix hack
import { getAppPropertyInformation, UPDATE_PROPERTIES_ACTION } from '../launchbar/shared/context-utils';

const DESKTOP_PLUGIN = ZoweZLUX.pluginManager.getDesktopPlugin();
const PROPERTIES_APP = 'org.zowe.zlux.appmanager.app.propview';
const DESKTOP_WALLPAPER_URI = ZoweZLUX.uriBroker.pluginConfigUri(DESKTOP_PLUGIN,'ui/themebin', 'wallpaper');
const DESKTOP_WALLPAPER_MAX_SIZE = 3;

@Component({
  selector: 'rs-com-window-pane',
  templateUrl: 'window-pane.component.html',
  styleUrls: ['window-pane.component.css']
})
export class WindowPaneComponent implements OnInit, MVDHosting.LoginActionInterface, MVDHosting.LogoutActionInterface {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  public contextMenuDef: {xPos: number, yPos: number, items: ContextMenuItem[]} | null;
  public wallpaper: any = { };
  private authenticationManager: MVDHosting.AuthenticationManagerInterface;
  private pluginManager: MVDHosting.PluginManagerInterface;

  private links: MVDHosting.LinkDefinition[] = [];
  
  @Input() theme: DesktopTheme;

  @ViewChildren('links') linkRefs: QueryList<ElementRef>;
  
  constructor(
    public windowManager: WindowManagerService,
    private injector: Injector,
    private http: HttpClient,
    private themeService: ThemeEmitterService,
    private translation: TranslationService,
  ) {
    this.logger.debug("ZWED5320I", windowManager); //this.logger.debug("Window-pane-component wMgr=",windowManager);
    this.contextMenuDef = null;
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
    this.authenticationManager.registerPostLoginAction(this);
    this.authenticationManager.registerPreLogoutAction(this);
    this.pluginManager.linksAdded.subscribe((links: MVDHosting.LinkDefinition[])=> {
      console.log('links added');
      links.forEach((link)=> {
        if (!link.isDisabled()) {
          this.links.push(link);
        }
      });
    });
    this.pluginManager.linkRemoved.subscribe((link: MVDHosting.LinkDefinition)=> {
      console.log('a link removed');
      let index = this.links.findIndex((oldLink)=> link.getKey() == oldLink.getKey());
      if (index != -1) {
        this.links = this.links.splice(index, 1);
      }
    });
  }

  private replaceWallpaper(url:string) {
    this.http.head(url, {observe: 'response'}).subscribe((result:HttpResponse<any>) => {
      if (result.status != 204 && result.ok) {
        this.wallpaper.background = `url(${url}) no-repeat center/cover`;
      }
    }, error => {
      this.resetWallpaperDefault();
    });
  }

  onLogout(username: string) {
    this.links = [];
    this.resetWallpaperDefault();
    return true;
  }

  onLogin(username:string, plugins:ZLUX.Plugin[]):boolean {
    this.replaceWallpaper(DESKTOP_WALLPAPER_URI);
    return true;
  }

  ngOnInit(): void {
    this.windowManager.contextMenuRequested.subscribe(menuDef => {
      this.contextMenuDef = menuDef;
    });

    this.themeService.onWallpaperChange
      .subscribe((image:any) => {
        let temp = this.wallpaper.background;
        this.resetWallpaperDefault();
        // TODO: Fix bug where sometimes uploading one image after another, fails to render new image (but works after restart)
        this.http.put<DesktopTheme>(DESKTOP_WALLPAPER_URI, image)
          .subscribe((data: any) => { 
            this.resetWallpaperDefault();
            this.logger.debug("Attempted to post image with status: ", data);
            this.replaceWallpaper(DESKTOP_WALLPAPER_URI);
          },
          (error: any) => {
            this.wallpaper.background = temp;
            const notifTitle = this.translation.translate("Personalization");
            let notifMessage;
            if (error.status = 413) //payload too large
            { // Needs translations
              notifMessage = `Wallpaper changed failed: Server supports a max size of '` + DESKTOP_WALLPAPER_MAX_SIZE + `' mb.`;
            } else {
              notifMessage = `Wallpaper changed failed - ` + error.status + `: ` + error.message;
            }
            ZoweZLUX.notificationManager.notify(ZoweZLUX.notificationManager.createNotification(notifTitle, notifMessage, 1, "org.zowe.zlux.ng2desktop.settings"));
          } );
      });

    this.themeService.onResetAllDefault
      .subscribe(() => {
        this.resetWallpaperDefault();
        this.http.delete<DesktopTheme>(DESKTOP_WALLPAPER_URI)
          .subscribe((data: any) => { 
            this.logger.debug("Attempted to delete image with status: ", data);
            this.replaceWallpaper(DESKTOP_WALLPAPER_URI);
          });
      });
  }

  closeContextMenu(): void {
    this.contextMenuDef = null;
  }

  onLinkContext(event:any, link:any): void {
    console.log('link click=',link);
    let linkRef: LinkComponent;
    for (let i = 0; i < (this.linkRefs as any)._results.length; i++) {
      let ref = (this.linkRefs as any)._results[i];
      //TODO silly naming
      if (ref._link.link.name == link.link.name
          && ref._link.key == link.key) {
        linkRef = ref;
        break;
      }
    }
    const pos = this.getElementPosition(event);
//    console.log('pm=',this.pluginManager);
    //    ZoweZLUX.pluginManager.getPlugin(link.plugin.identifier)
    console.log('menu at x, y',pos.x,pos.y);
    this.windowManager.contextMenuRequested.next({ xPos: pos.x, yPos: pos.y, items: [
      {"text":"Remove",
       "action":()=> {
         this.pluginManager.removeLink(link);
       }
      },
      {"text":"Properties",
       "action":()=> {
         let propertyPluginDef = ZoweZLUX.pluginManager.getPlugin(PROPERTIES_APP);
         let propertyWindowID = this.windowManager.getWindow(propertyPluginDef);
         if (propertyWindowID!=null){
           this.windowManager.requestWindowFocus(propertyWindowID);
         }
         //TODO wrong plugin object, throws error
         const info = getAppPropertyInformation(ZoweZLUX.pluginManager.getPlugin(link.plugin.identifier));
         ZoweZLUX.dispatcher.invokeAction(UPDATE_PROPERTIES_ACTION, info);
       }
      },
      {"text":"Open New",
       "action":()=> {
         linkRef.openLink();
       }
      },
      /* TODO possible by putting app2app into URL
      {"text":"Open in New Browser Tab",
       "action":()=> {
         const pluginType:string = item.plugin.getFramework();
         //future TODO: initialize cross-window app2app communication??
         if (pluginType === 'iframe' && !(item.plugin.standaloneUseFramework)) {
           // Still allows IFrames to comprehend URL parameters if address is copy/pasted later. Should not break any app2app possibilities
           let pluginWebContent = item.plugin.getBasePlugin().getWebContent();
           if(pluginWebContent.destination > '') {
             window.open(`${location.origin}${ZoweZLUX.uriBroker.pluginIframeUri(item.plugin.getBasePlugin(), '')}`);
           } else {
             window.open(`${location.origin}${ZoweZLUX.uriBroker.pluginResourceUri(item.plugin.getBasePlugin(), pluginWebContent.startingPage)}`);
           }
         } else {
           window.open(`${location.href}?pluginId=${item.plugin.basePlugin.getIdentifier()}&showLogin=true`);
         }

       }
      }      
      */
    ]});
  }

  private getElementPosition(elm: any): any {
    return {x:elm.x, y:elm.y};
  }
  
  resetWallpaperDefault(): void {
    this.wallpaper.background = '';
  }

  get windows(): DesktopWindow[] {
    return this.windowManager.getAllWindows();
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

