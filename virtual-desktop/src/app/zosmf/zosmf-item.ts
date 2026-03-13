/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

export interface ZosmfItem {
  isLink: boolean;
  bundleUrl: string;
  displayName: string;
  bundleId: string;
  idOriginal: string;
  PluginID: string;
  type: string;
  targets: string;
  uninstalled: null;
  isWin: boolean;
  localSysplexScope: boolean;
  target: string;
  multiSysplexScope: boolean;
  sysplexScope: boolean;
  name: string;
  actionInfo: string;
  bundleName: string;
  id: string;
  category: string;
  miscTaskData: string;
  desktopOnly: boolean;
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
