

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
                            "imgSrc":"keyboardSettings.png",
                           },
                           {
                            "title":"Date and Time",
                            "imgSrc":"keyboardSettings.png",
                           },
                           {
                            "title":"Display",
                            "imgSrc":"keyboardSettings.png",
                           },
                           {
                            "title":"Skins",
                            "imgSrc":"keyboardSettings.png",
                           },
                           {
                            "title":"Language",
                            "imgSrc":"keyboardSettings.png",
                           },
                           {
                            "title":"User Profile",
                            "imgSrc":"keyboardSettings.png",
                           },
                           {
                            "title":"Fonts",
                            "imgSrc":"keyboardSettings.png",
                           },
                           {
                            "title":"Sounds",
                            "imgSrc":"keyboardSettings.png",
                           },
                           {
                            "title":"Printer",
                            "imgSrc":"keyboardSettings.png",
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

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

}