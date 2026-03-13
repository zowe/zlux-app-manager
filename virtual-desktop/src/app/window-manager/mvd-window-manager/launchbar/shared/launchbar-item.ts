

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
  parentLaunchbarItem?: LaunchbarItem;
  childrenLaunchbarItems?: LaunchbarItem[];
  childrenIds?: string[];
  isExpanded?: boolean;
}

export interface LaunchbarItemJson {
  label: string;
  image: string | null;
  tooltip: string;
  pluginId?: string;
  launchMetadata: any;
  instanceIds: Array<number>;
  showInstanceView: boolean;
  showIconLabel: boolean;
  childrenLaunchbarItems?: LaunchbarItemJson[];
  childrenIds?: string[];
  isExpanded?: boolean;
}

export function launchBarItemToJson(item: LaunchbarItem): LaunchbarItemJson {
  const pluginId = item.plugin ? item.plugin.getIdentifier() : undefined;
  const children = item.childrenLaunchbarItems ? item.childrenLaunchbarItems.map(launchBarItemToJson) : undefined;
  return <LaunchbarItemJson>{
    ...item,
    plugin: undefined,
    windowPreviews: undefined,
    pluginId: pluginId,
    childrenLaunchbarItems: children,
    parentLaunchbarItem: undefined
  };
}

export function launchBarItemFromJson(item: LaunchbarItemJson, parent?: LaunchbarItem): LaunchbarItem {
  let pluginDef: DesktopPluginDefinitionImpl;
  if (item.pluginId) {
    const plugin = ZoweZLUX.pluginManager.getPlugin(item.pluginId);
    if (plugin) {
      pluginDef = new DesktopPluginDefinitionImpl(plugin);
    }
  }
  const newItem: LaunchbarItem = <LaunchbarItem>{
    ...item,
    pluginId: undefined,
    plugin: pluginDef!,
    windowPreviews: [],
    parentLaunchbarItem: parent
  }
  const children = item.childrenLaunchbarItems;
  newItem.childrenLaunchbarItems = children ? children.map(item => launchBarItemFromJson(item, newItem)) : undefined;
  return newItem;
}


// export abstract class LaunchbarItem {
//   abstract readonly label: string;
//   abstract readonly image: string | null;
//   abstract readonly tooltip: string;
//   abstract readonly plugin?: DesktopPluginDefinitionImpl;
//   abstract readonly launchMetadata?: any;
//   abstract readonly windowPreviews?: Array<HTMLImageElement>;
//   abstract readonly instanceIds?: Array<number>;
//   showInstanceView?: boolean;
//   showIconLabel: boolean;
//   parentLaunchbarItem?: boolean;
//   childrenLaunchbarItems?: LaunchbarItem[];
// }


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

