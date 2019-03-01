

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
  
   personalizationTools = [{
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
                           },
                           {
                            "title":"Language",
                            "imgSrc":"foreign_language",
                           },
                           {
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
                           }
  ];

   constructor(
    private injector: Injector,
    public windowManager: WindowManagerService,
    private translation: TranslationService
  ) {
   }
  
  ngOnInit(): void {

  }

  openTool (tool:any) {
    
  }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

}