
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

export interface ZoweApplication {
  identifier: string;
  license?: string;
  homepage?: string;
  author?: string;
  webContent: WebContent;
  location?: string;
  template?: string;
  pluginVersion?:string;
}

export interface WebContent {
  framework: string;
  launchDefinition: LaunchDefinition;
  descriptionDefault: string;
  defaultWindowStyle: DefaultWindowStyle;
}

export interface LaunchDefinition {
  pluginShortNameDefault: string;
}

export interface DefaultWindowStyle {
  width: number;
  height: number;
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
