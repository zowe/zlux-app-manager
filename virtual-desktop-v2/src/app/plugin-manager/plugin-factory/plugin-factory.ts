

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

//import { DesktopPluginDefinition } from '../shared/desktop-plugin-definition';
import { CompiledPlugin } from '../shared/compiled-plugin';

export abstract class PluginFactory {
  abstract acceptableFrameworks(): string[];
  abstract loadPlugin(plugin: MVDHosting.DesktopPluginDefinition, id: MVDHosting.ViewportId): Promise<CompiledPlugin>;
  abstract loadComponentFactories(plugin: MVDHosting.DesktopPluginDefinition): Promise<void>;
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

