/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

export type TargetPluginMode = 'create' | 'findAnyOrCreate' | 'findUniqueOrCreate' | 'system';

export interface PluginLaunchURLParams {
  targetPluginId: string;
  targetPluginData: any;
  targetPluginMode: TargetPluginMode;
  targetPluginInstanceId?: MVDHosting.InstanceId;
}

export function isValidTargetPluginMode(mode: string): mode is TargetPluginMode {
  return mode === 'create' || mode === 'findAnyOrCreate' || mode === 'findUniqueOrCreate' || mode === 'system';
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
