

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Injector, HostListener } from '@angular/core';
import { WindowManagerService } from '../shared/window-manager.service';
import { DesktopPluginDefinitionImpl } from "../../../../app/plugin-manager/shared/desktop-plugin-definition";
import { DesktopComponent } from "../desktop/desktop.component";
import { L10nTranslationService } from 'angular-l10n';
import { ThemeEmitterService } from '../services/theme-emitter.service';

const CHANGE_PASSWORD = "Change Password"
const LANGUAGES = "Languages"
const PERSONALIZATION = "Personalization"

@Component({
  selector: 'rs-com-personalization-panel',
  templateUrl: './personalization-panel.component.html',
  styleUrls: ['./personalization-panel.component.css'],
  providers: [WindowManagerService]
})
export class PersonalizationPanelComponent {
  @HostListener('document:click', ['$event.target'])
  public onClick(targetElement: any) {
    if (this.panelMouseHover == false)
    {
      this.desktopComponent.hidePersonalizationPanel();
    }
  }
  private settingsWindowPluginDef: DesktopPluginDefinitionImpl;
  private pluginManager: MVDHosting.PluginManagerInterface;
  public applicationManager: MVDHosting.ApplicationManagerInterface;
  public authenticationManager: MVDHosting.AuthenticationManagerInterface;
  public personalizationTools = [ /* The following code is commented out, as these host the prototype for future modules
                            of the Settings & Personalization app. */
                           {
                            "title":this.translation.translate(LANGUAGES),
                            "imgSrc":"foreign_language",
                           },
                           {
                            "title":this.translation.translate(CHANGE_PASSWORD),
                            "imgSrc":"password"
                           },
                          /*  {
                            "title":"User Profile",
                            "imgSrc":"management",
                           }, */
                           {
                            "title":this.translation.translate(PERSONALIZATION),
                            "imgSrc":"personalization",
                           },
  ];
  private panelMouseHover: boolean;
  public showPanel: boolean;
  public showPersonalization: boolean;
  public panelWidth: string;
  public panelMaxWidth: string;

   constructor(
    private injector: Injector,
    private windowManager: WindowManagerService,
    private desktopComponent: DesktopComponent,
    private translation: L10nTranslationService,
    private themeService: ThemeEmitterService
  ) {
    this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
    this.authenticationManager = this.injector.get(MVDHosting.Tokens.AuthenticationManagerToken);
    this.goToPanel();
   }
  
  ngOnInit(): void {
    this.pluginManager.findPluginDefinition("org.zowe.zlux.ng2desktop.settings").then(personalizationsPlugin => {
      const pluginImpl:DesktopPluginDefinitionImpl = personalizationsPlugin as DesktopPluginDefinitionImpl;
      this.settingsWindowPluginDef=pluginImpl;
    })
    this.themeService.onGoBack
      .subscribe(() => {
        this.goToPanel();
      });
  }

  getAppPropertyInformation(toolName: string):any{
    return {
      "isPropertyWindow":false,
      "settingsToolName":toolName,
      "copyright":this.settingsWindowPluginDef.getCopyright(),
      "image":this.settingsWindowPluginDef.image
    };
  }

  openTool(tool: any): void {
    switch(tool.title) { 
      case this.translation.translate(CHANGE_PASSWORD): { 
        this.authenticationManager.requestPasswordChangeScreen(); 
        break; 
      } 
      case this.translation.translate(PERSONALIZATION): { 
        this.goToPersonalization();
        break; 
      } 
      default: { 
        let propertyWindowID = this.windowManager.getWindow(this.settingsWindowPluginDef);
        if (propertyWindowID == null) {
          this.desktopComponent.hidePersonalizationPanel();
          this.applicationManager.spawnApplication(this.settingsWindowPluginDef, this.getAppPropertyInformation(tool.title));
        } else {
          this.windowManager.showWindow(propertyWindowID);
        } 
        break; 
      } 
    }
  }

  panelMouseEnter(): void {
    this.panelMouseHover = true;
  }

  panelMouseLeave(): void {
    this.panelMouseHover = false;
  }

  goToPanel(): void {
    this.showPanel = true;
    this.panelWidth = "100%";
    this.panelMaxWidth = "100%";
  }

  goToPersonalization(): void {
    this.showPanel = false;
    this.showPersonalization = true;
    this.panelWidth = "420px";
    this.panelMaxWidth = "420px";
  }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

}