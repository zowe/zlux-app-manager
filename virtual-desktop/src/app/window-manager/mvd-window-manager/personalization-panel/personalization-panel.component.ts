

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Injector } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { WindowManagerService } from '../shared/window-manager.service';
import { TranslationService } from 'angular-l10n';
import { DesktopPluginDefinitionImpl } from "../../../../app/plugin-manager/shared/desktop-plugin-definition";
import { DesktopComponent } from "../desktop/desktop.component";

const CONTAINER_HEIGHT = 60;
const ICONS_INITIAL_HEIGHT = -15;
const ICONS_CHANGED_HEIGHT = 35;

@Component({
  selector: 'rs-com-personalization-panel',
  templateUrl: './personalization-panel.component.html',
  styleUrls: ['./personalization-panel.component.css'],
  providers: [WindowManagerService]
})
export class PersonalizationComponent {
  settingsWindowPluginDef : DesktopPluginDefinitionImpl;
  pluginManager: MVDHosting.PluginManagerInterface;
  public applicationManager: MVDHosting.ApplicationManagerInterface;
   personalizationTools = [ /* The following code is commented out, as these host the prototype for future modules
                            of the Settings app.
                          {
                            "title":"Keyboard Controls",
                            "imgSrc":"keyboard",
                           },
                           {
                            "title":"Date and Time",
                            "imgSrc":"calendar",
                           },
                           {
                            "title":"Display",
                            "imgSrc":"resolution",
                           },
                           {
                            "title":"Skins",
                            "imgSrc":"color_correction",
                           }, */
                           {
                            "title":"Languages",
                            "imgSrc":"foreign_language",
                           },
                          /*  {
                            "title":"User Profile",
                            "imgSrc":"management",
                           },
                           {
                            "title":"Fonts",
                            "imgSrc":"font_color",
                           },
                           {
                            "title":"Sounds",
                            "imgSrc":"audio_volume_medium",
                           },
                           {
                            "title":"Printer",
                            "imgSrc":"printer",
                           } */
  ];

   constructor(
    private injector: Injector,
    public windowManager: WindowManagerService,
    private translation: TranslationService,
    public desktopComponent: DesktopComponent,
  ) {
    this.pluginManager = this.injector.get(MVDHosting.Tokens.PluginManagerToken);
    this.applicationManager = this.injector.get(MVDHosting.Tokens.ApplicationManagerToken);
   }
  
  ngOnInit(): void {
    this.pluginManager.findPluginDefinition("org.zowe.zlux.appmanager.app.settingsviewer").then(personalizationsPlugin => {
      const pluginImpl:DesktopPluginDefinitionImpl = personalizationsPlugin as DesktopPluginDefinitionImpl;
      this.settingsWindowPluginDef=pluginImpl;
    })
  }

  getAppPropertyInformation():any{
    return {"isPropertyWindow":false,
    "settingsToolName":this.settingsWindowPluginDef.defaultWindowTitle,
    "copyright":this.settingsWindowPluginDef.getCopyright(),
    "image":this.settingsWindowPluginDef.image
    };
  }

  openTool (tool:any) {
    console.log("Tool: " + tool);
    let propertyWindowID = this.windowManager.getWindow(this.settingsWindowPluginDef);
    if (propertyWindowID == null) {
      this.desktopComponent.hidePersonalizationPanel();
      this.applicationManager.spawnApplication(this.settingsWindowPluginDef,this.getAppPropertyInformation());
    } else {
      this.windowManager.showWindow(propertyWindowID);
    }
  }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

}