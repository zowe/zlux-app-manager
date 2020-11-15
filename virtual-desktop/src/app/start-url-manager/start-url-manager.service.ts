/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector } from '@angular/core';
import { BaseLogger } from 'virtual-desktop-logger';
import { App2AppArgs } from './app2app-args';
import { App2AppArgsParser } from './app2app-args-parser.service';

@Injectable()
export class StartURLManager implements MVDHosting.LoginActionInterface {
  private done = false;
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;

  constructor(
    public parser: App2AppArgsParser,
    public injector: Injector
  ) {
    this.registerTestAction();
  }

  onLogin(_username: string, _plugins: ZLUX.Plugin[]): boolean {
    if (this.done) {
      return true;
    }
    this.done = true;
    const allArgs = this.getAllApp2AppArgsFromURL();
    for (const args of allArgs) {
      if (this.validateApp2AppArgs(args)) {
        this.invokeApp2App(args);
      }
    }
    return true;
  }

  private validateApp2AppArgs(args: App2AppArgs): boolean {
    const { dispatcher, pluginManager } = ZoweZLUX;
    const plugin = pluginManager.getPlugin(args.pluginId);
    if (!plugin) {
      // this.logger.warn('Plugin not found for identifier %s specified in app2app query URL parameter', args.pluginId);
      this.logger.warn('ZWED5193W', args.pluginId);
      return false;
    }
    if (args.actionType !== 'launch' && args.actionType !== 'message') {
      // this.logger.warn('Action Type(%s) specified  in app2app query URL parameter is invalid', args.actionType);
      this.logger.warn('ZWED5194W', args.actionType);
      return false;
    }
    if (args.actionMode !== 'create' && args.actionMode !== 'system') {
      // this.logger.warn('Action Mode(%s) specified  in app2app query URL parameter is invalid', args.actionMode);
      this.logger.warn('ZWED5195W', args.actionMode);
      return false;
    }
    try {
      JSON.parse(args.contextData);
    } catch (e) {
      // this.logger.warn('Context Data(%s) specified in app2app query URL parameter is not valid JSON', args.contextData);
      this.logger.warn('ZWED5196W', args.contextData);
      return false;
    }
    if (args.formatter !== 'data') {
      const abstractAction = dispatcher.getAbstractActionById(args.formatter);
      if (!abstractAction) {
        // this.logger.warn('Unable to find registered action for identifier %s specified in app2app query URL parameter', args.formatter);
        this.logger.warn('ZWED5197W', args.formatter);
        return false;
      }
    }
    return true;
  }

  private invokeApp2App(args: App2AppArgs): void {
    const { dispatcher } = ZoweZLUX;
    const ActionType = dispatcher.constants.ActionType;
    const ActionTargetMode = dispatcher.constants.ActionTargetMode;
    const targetPluginId = args.pluginId;
    const type = args.actionType === 'launch' ? ActionType.Launch : ActionType.Message;
    const mode = args.actionMode === 'create' ? ActionTargetMode.PluginCreate : ActionTargetMode.System;
    const contextData: any = JSON.parse(args.contextData);
    let action: ZLUX.Action;
    let argumentData: any;
    if (args.formatter === 'data') {
      const actionTitle = 'Launch app from URL';
      const actionId = 'org.zowe.zlux.url.launch';
      const argumentFormatter = { data: { op: 'deref', source: 'event', path: ['data'] } };
      action = dispatcher.makeAction(actionId, actionTitle, mode, type, args.pluginId, argumentFormatter);
      argumentData = { data: contextData };
    } else {
      const abstractAction = dispatcher.getAbstractActionById(args.formatter);
      action = <ZLUX.Action>{
        ...abstractAction,
        targetPluginID: targetPluginId,
        type: type,
        targetMode: mode,
      };
      argumentData = contextData;
    }
    dispatcher.invokeAction(action, argumentData)
    .then(() => {})
    .catch((e:any) => this.handleInvokeActionError(e));
  }

  private getAllApp2AppArgsFromURL(): App2AppArgs[] {
    const queryString = location.search.substr(1);
    const app2appArray: string[][] = [];
    queryString.split('&').forEach(part => {
      const [key, value] = part.split('=').map(v => decodeURIComponent(v));
      // TODO: Check against a list of known URI arg params instead of hardcode
      if (key === 'app2app' || key === 'pluginId') {
        app2appArray.push([key, value]);
      }
    });
    return app2appArray.map(value => this.parser.parse(value));
  }

  private registerTestAction(): void {
    const { dispatcher } = ZoweZLUX;
    const actionTitle = 'test action';
    const actionId = 'org.zowe.zlux.test.action';
    const argumentFormatter = { data: { op: 'deref', source: 'event', path: ['data'] } };
    const type = dispatcher.constants.ActionType.Launch;
    const mode = dispatcher.constants.ActionTargetMode.PluginCreate;
    const testAction = dispatcher.makeAction(actionId, actionTitle, mode, type, 'org.zowe.zlux.ng2desktop', argumentFormatter);
    dispatcher.registerAction(testAction);
  }
  
  private handleInvokeActionError(e: Error | string) {
    if (typeof e === 'string') {
      this.logger.warn(e);
    } else if (e instanceof Error) {
      this.logger.warn(e.message);
    }
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
