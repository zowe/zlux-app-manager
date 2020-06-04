/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';
import { ZluxErrorSeverity, ZluxPopupManagerService } from '@zlux/widgets';
import { TranslationService } from 'angular-l10n';
import { BaseLogger } from 'virtual-desktop-logger';
import { PluginLaunchURLParams } from './plugin-launch-url-params';


const TARGET_PLUGIN_ID = 'targetPluginId';
const TARGET_PLUGIN_DATA = 'targetPluginData';

@Injectable()
export class StartURLManager implements MVDHosting.LoginActionInterface {
  private done = false;
  private readonly popupOptions: { blocking: boolean; buttons: any[]; };
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;

  constructor(
    private popupManager: ZluxPopupManagerService,
    private translation: TranslationService,
  ) {
    this.popupOptions = {
      blocking: true,
      buttons: [this.translation.translate('Close')],
    };
  }

  /*
    https://localhost:8544/ZLUX/plugins/org.zowe.zlux.bootstrap/web/index.html?targetPluginId=org.zowe.zlux.ng2desktop.webbrowser&targetPluginData={%22url%22:%22https://www.github.com%22,%22enableProxy%22:true}
  */
  onLogin(_username: string, _plugins: ZLUX.Plugin[]): boolean {
    if (this.done) {
      return true;
    }
    this.done = true;

    const { dispatcher, pluginManager } = ZoweZLUX;
    const { targetPluginId, targetPluginData } = this.getPluginLaunchURLParams();
    if (typeof targetPluginId === 'undefined') {
      return true;
    }
    const plugin = pluginManager.getPlugin(targetPluginId);
    if (!plugin) {
      const translatedMessage = this.translation.translate('Plugin not found for identifier {{targetPluginId}}', { targetPluginId });
      this.popupManager.reportError(
        ZluxErrorSeverity.WARNING,
        this.translation.translate('Unable to launch application'),
        translatedMessage, this.popupOptions);
      return false;
    }
    const type = dispatcher.constants.ActionType.Launch;
    const mode = dispatcher.constants.ActionTargetMode.PluginCreate;
    const actionTitle = 'Launch app from URL';
    const actionId = 'org.zowe.zlux.url.launch';
    const argumentFormatter = { data: { op: 'deref', source: 'event', path: ['data'] } };
    const action = dispatcher.makeAction(actionId, actionTitle, mode, type, targetPluginId, argumentFormatter);
    const argumentData = { data: targetPluginData };
    dispatcher.invokeAction(action, argumentData);
    return true;
  }

  private getPluginLaunchURLParams(): Partial<PluginLaunchURLParams> {
    const queryString = location.search.substr(1);
    const queryObject: { [key: string]: string } = {};
    queryString.split('&').forEach(part => {
      const [key, value] = part.split('=').map(v => decodeURIComponent(v));
      queryObject[key] = value;
    });
    let targetPluginData = {};
    const data = queryObject[TARGET_PLUGIN_DATA];
    try {
      targetPluginData = JSON.parse(data);
    } catch (e) {
      // this.logger.warn(`Unable to parse %s URL query parameter %s`, TARGET_PLUGIN_DATA, e.message);
      this.logger.warn('ZWED5192W', TARGET_PLUGIN_DATA, e.message);
    }
    const targetPluginId = queryObject[TARGET_PLUGIN_ID];
    return { targetPluginId, targetPluginData };
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
