

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from 'app/shared/shared.module';
import { ApplicationManagerModule } from 'app/application-manager/application-manager.module';

import { LaunchbarModule } from './launchbar/launchbar.module';
import { DesktopComponent } from './desktop/desktop.component';
import { WindowPaneComponent } from './window-pane/window-pane.component';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { WindowComponent } from './window/window.component';
import { WindowManagerService } from './shared/window-manager.service';
import { DraggableDirective } from './shared/draggable.directive';
import { SizeableDirective } from './shared/sizeable.directive';
import { MvdComponent } from './mvd.component';
import { AuthenticationModule } from '../../authentication-manager/authentication-manager.module';
import { PersonalizationComponent } from '../mvd-window-manager/personalization-panel/personalization-panel.component';

@NgModule({
  imports: [
    ApplicationManagerModule,
    AuthenticationModule,
    CommonModule,
    SharedModule,
    LaunchbarModule,
    HttpClientModule
  ],
  declarations: [
    DesktopComponent,
    WindowPaneComponent,
    WindowComponent,
    DraggableDirective,
    SizeableDirective,
    ContextMenuComponent,
    MvdComponent,
    PersonalizationComponent
  ],
  exports: [
    DesktopComponent
  ],
  providers: [
    WindowManagerService,
    /* Expose to the rest of the desktop */
    { provide: MVDWindowManagement.Tokens.WindowManagerToken, useExisting: WindowManagerService }
  ]
})
export class WindowManagerModule {

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

