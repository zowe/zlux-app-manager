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

  constructor() {

  }

  parse(app2app: string): App2AppArgs {
    this.startIndex = 0;
    this.length = app2app.length;
    this.data = app2app;
    const pluginId = this.getPart();
    const actionType = this.getPart();
    const actionMode = this.getPart();
    const formatter = this.getPart();
    const contextData = this.getLastPart();
    return {
      pluginId,
      actionType,
      actionMode,
      formatter,
      contextData,
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
