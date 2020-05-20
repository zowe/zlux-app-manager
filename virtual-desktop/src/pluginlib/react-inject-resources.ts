

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Angular2PluginWindowActions, Angular2PluginWindowEvents, Angular2PluginViewportEvents, 
  Angular2PluginSessionEvents, Angular2PluginThemeEvents } from './inject-resources';


type ReactPluginWindowActions = Angular2PluginWindowActions;
type ReactPluginWindowEvents = Angular2PluginWindowEvents;
type ReactPluginViewportEvents = Angular2PluginViewportEvents;
type ReactPluginSessionEvents = Angular2PluginSessionEvents;
type ReactPluginThemeEvents = Angular2PluginThemeEvents;

export interface ReactMVDResources {
  readonly mainWindowId: MVDWindowManagement.WindowId | null;
  readonly windowActions: ReactPluginWindowActions | null;
  readonly windowEvents: ReactPluginWindowEvents | null;
  readonly viewportEvents: ReactPluginViewportEvents;
  readonly logger: ZLUX.ComponentLogger;
  readonly pluginDefinition: MVDHosting.DesktopPluginDefinition;
  readonly launchMetadata: any;
  readonly instanceId: MVDHosting.InstanceId;
  readonly sessionEvents: ReactPluginSessionEvents;
  readonly themeEvents: ReactPluginThemeEvents | null;
};

/* TODO
export interface Angular2PluginEmbedActions {
  readonly createEmbeddedInstance: (identifier: string, launchMetadata: any, viewContainer: ViewContainerRef) => Promise<EmbeddedInstance>;
}
*/


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

