/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';
import { App2AppArgs } from './app2app-args';


@Injectable()
export class App2AppArgsParser {
  private startIndex: number;
  private length: number;
  private data: string;
  private isFirstFullscreenApp: boolean;

  constructor() {
    this.isFirstFullscreenApp = true;
  }

  parse(app2appArray: string[]): App2AppArgs {
    let app2appKey = app2appArray[0];
    let app2app = app2appArray[1];
    let pluginId, actionType, actionMode, formatter, contextData;
    switch(app2appKey) {
      case "pluginId": // Open In New Browser Tab
        pluginId = app2app;
        actionType = "launch";
        actionMode = "create";
        formatter = "data";
        contextData = '{"isFirstFullscreenApp":"' + this.isFirstFullscreenApp + '"}';
        this.isFirstFullscreenApp = false;
        break;
      default: // Assume normal app2app
        this.startIndex = 0;
        this.length = app2app.length;
        this.data = app2app;
        pluginId = this.getPart();
        actionType = this.getPart();
        actionMode = this.getPart();
        formatter = this.getPart();
        contextData = this.getLastPart();
    }
    return {
      pluginId,
      actionType,
      actionMode,
      formatter,
      contextData
    };
  }

  private getPart(): string {
    for (let index = this.startIndex; index < this.length; index++) {
      if (this.data[index] === ':') {
        const part = this.data.substring(this.startIndex, index);
        this.startIndex = index + 1;
        return part;
      }
    }
    return '';
  }

  private getLastPart(): string {
    const part = this.data.substring(this.startIndex);
    this.startIndex = this.length;
    return part;
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
