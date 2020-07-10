

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, Injector, Input } from '@angular/core';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { DesktopTheme } from "../desktop/desktop.component";
import { HttpClient, HttpResponse } from '@angular/common/http';
import { DesktopWindow } from '../shared/desktop-window';
import { WindowManagerService } from '../shared/window-manager.service';
import { BaseLogger } from 'virtual-desktop-logger';
import { ThemeEmitterService } from '../services/theme-emitter.service';
import { SnackBarService } from '../services/snack-bar.service';

const DESKTOP_PLUGIN = ZoweZLUX.pluginManager.getDesktopPlugin();
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

  @Input() theme: DesktopTheme;
  
  constructor(
    public windowManager: WindowManagerService,
    private injector: Injector,
    private http: HttpClient,
    private themeService: ThemeEmitterService,
    private snackBar: SnackBarService
  ) {
    this.logger.debug("ZWED5320I", windowManager); //this.logger.debug("Window-pane-component wMgr=",windowManager);
    this.contextMenuDef = null;
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.authenticationManager.registerPostLoginAction(this);
    this.authenticationManager.registerPreLogoutAction(this);
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
        // TODO: Fix bug where sometimes uploading one image after another, fails to render new image (but works after restart)
        this.http.put<DesktopTheme>(DESKTOP_WALLPAPER_URI, image)
          .subscribe((data: any) => { 
            this.resetWallpaperDefault();
            this.logger.debug("Attempted to post image with status: ", data);
            this.replaceWallpaper(DESKTOP_WALLPAPER_URI);
          },
          (error: any) => {
            if (error.status = 413) //payload too large
            {
              this.snackBar.open(`Wallpaper changed failed: Server supports a max size of '` + DESKTOP_WALLPAPER_MAX_SIZE + `' mb.`, 'Close');
            } else {
              this.snackBar.open(`Wallpaper changed failed - ` + error.status + `: ` + error.message, 'Close');
            }
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

