

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';

export abstract class LaunchbarItem {
  abstract readonly label: string;
  abstract readonly image: string | null;
  abstract readonly tooltip: string;
  abstract readonly plugin: DesktopPluginDefinitionImpl;
  abstract readonly launchMetadata: any;
  abstract readonly windowPreviews: Array<HTMLImageElement>;
  abstract readonly instanceIds: Array<number>;
  showInstanceView: boolean;
  showIconLabel: boolean;
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

