/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

export interface LaunchMetadata {
  data: Partial<WebBrowserLaunchMetadata>;
}

export interface WebBrowserLaunchMetadata {
  url: string;
  hideControls: boolean;
  enableProxy: boolean;
}

export function isLaunchMetadata(data: any): data is LaunchMetadata {
  return data && data.data != null && typeof data.data === 'object';
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
