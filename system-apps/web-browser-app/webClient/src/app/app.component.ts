

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Inject } from '@angular/core';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { ZluxPopupManagerService } from '@zlux/widgets';

import { LocaleService, TranslationService } from 'angular-l10n';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [ZluxPopupManagerService]
})
export class AppComponent {

  constructor(
    public locale: LocaleService,
    public translation: TranslationService,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) public pluginDefinition: ZLUX.ContainerPluginDefinition,
    @Inject(Angular2InjectionTokens.LOGGER) public log: ZLUX.ComponentLogger,
    @Inject(Angular2InjectionTokens.LAUNCH_METADATA) public launchMetadata: any,
    public popupManager: ZluxPopupManagerService
  ) {
    this.popupManager.setLogger(log);
  }

  ngOnInit(): void {
    this.log.info(`web browser started`);
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

