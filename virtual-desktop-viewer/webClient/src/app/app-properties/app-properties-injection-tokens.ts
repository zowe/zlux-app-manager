

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { InjectionToken } from '@angular/core';
import { DesktopPluginDefinitionImpl } from '../../plugin-manager/shared/desktop-plugin-definition';

export const APP_PROPERTIES = new InjectionToken<any[]>('app-properties');
export const PLUGIN_DEF = new InjectionToken<DesktopPluginDefinitionImpl>('plugin-definition');


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

