/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { LaunchbarItem } from './launchbar-item';
import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { WindowManagerService } from '../../shared/window-manager.service';
import { PluginsDataService } from '../../services/plugins-data.service';
import { ContextMenuItem } from 'pluginlib/inject-resources';
import { L10nTranslationService } from 'angular-l10n';

const PROPERTIES_APP = 'org.zowe.zlux.appmanager.app.propview';
const PROPERTIES_ARGUMENT_FORMATTER = {data: {op:'deref',source:'event',path:['data']}};
const UPDATE_PROPERTIES_ACTION = ZoweZLUX.dispatcher.makeAction(PROPERTIES_APP+'.update',
                                                                'Update Properties View',
                                                                ZoweZLUX.dispatcher.constants.ActionTargetMode.PluginFindAnyOrCreate,
                                                                ZoweZLUX.dispatcher.constants.ActionType.Message,
                                                                PROPERTIES_APP,
                                                                PROPERTIES_ARGUMENT_FORMATTER);

function closeAllWindows(item: LaunchbarItem, windowManager: WindowManagerService): void {
  let windowIds = windowManager.getWindowIDs(item.plugin);
  if (windowIds != null) {
    windowIds.forEach(windowId => {
      windowManager.closeWindow(windowId);
    });
  }
}

function bringItemFront(item: LaunchbarItem, windowManager: WindowManagerService): void {
  let windowId = windowManager.getWindow(item.plugin);
  if (windowId != null) {
    windowManager.requestWindowFocus(windowId);
  }
}

function getAppPropertyInformation(plugin: DesktopPluginDefinitionImpl):any{
  const pluginImpl:DesktopPluginDefinitionImpl = plugin as DesktopPluginDefinitionImpl;
  const basePlugin = pluginImpl.getBasePlugin();
  return {data:{"isPropertyWindow":true,
          "appName":pluginImpl.defaultWindowTitle,
          "appId":pluginImpl.getIdentifier(),
          "appVersion":basePlugin.getVersion(),
          "appType":basePlugin.getType(),
          "copyright":pluginImpl.getCopyright(),
          "image":plugin.image
         }};    
}


function launchPluginPropertyWindow(plugin: DesktopPluginDefinitionImpl, windowManager: WindowManagerService){
  let propertyPluginDef = ZoweZLUX.pluginManager.getPlugin(PROPERTIES_APP);
  let propertyWindowID = windowManager.getWindow(propertyPluginDef);
  if (propertyWindowID!=null){
    windowManager.requestWindowFocus(propertyWindowID);
  }
  const info = getAppPropertyInformation(plugin);
  ZoweZLUX.dispatcher.invokeAction(UPDATE_PROPERTIES_ACTION, info);
}

function openWindow(item: LaunchbarItem, applicationManager: MVDHosting.ApplicationManagerInterface): void {
  item.showInstanceView = false;
  applicationManager.spawnApplication(item.plugin, null)
}

function openStandalone(item: LaunchbarItem): void {
  const pluginType:string = item.plugin.getFramework();
  //future TODO: initialize cross-window app2app communication??
  if (pluginType === 'iframe' && !(item.plugin.standaloneUseFramework)) {
    // Still allows IFrames to comprehend URL parameters if address is copy/pasted later. Should not break any app2app possibilities
    let pluginWebContent = item.plugin.getBasePlugin().getWebContent();
    if(pluginWebContent.destination > '') {
      window.open(`${location.origin}${ZoweZLUX.uriBroker.pluginIframeUri(item.plugin.getBasePlugin(), '')}`);
    } else {
      window.open(`${location.origin}${ZoweZLUX.uriBroker.pluginResourceUri(item.plugin.getBasePlugin(), pluginWebContent.startingPage)}`);
    }
  } else {
    window.open(`${location.href}?pluginId=${item.plugin.basePlugin.getIdentifier()}&showLogin=true`);
  }
}

export function generateInstanceActions(item: LaunchbarItem,
                                        pluginsDataService: PluginsDataService,
                                        translationService: L10nTranslationService,
                                        applicationManager: MVDHosting.ApplicationManagerInterface,
                                        windowManager: WindowManagerService): ContextMenuItem[] {
  let menuItems: ContextMenuItem[];
  if (item.instanceIds.length == 1) {
    menuItems = [
      { "text": translationService.translate("Open New"), "action": ()=> openWindow(item, applicationManager)},
      { "text" : translationService.translate("Open in New Browser Tab"), "action": () => openStandalone(item)},
      { "text": translationService.translate('BringToFront'), "action": () => bringItemFront(item, windowManager) },
      pluginsDataService.pinContext(item),
      { "text": translationService.translate('Properties'), "action": () => launchPluginPropertyWindow(item.plugin, windowManager) },
      { "text": translationService.translate("Close All"), "action": ()=> closeAllWindows(item, windowManager)},
    ];
  } else if (item.instanceIds.length != 0) {
    menuItems = [
      { "text": translationService.translate("Open New"), "action": ()=> openWindow(item, applicationManager)},
      { "text" : translationService.translate("Open in New Browser Tab"), "action": () => openStandalone(item)},
      pluginsDataService.pinContext(item),
      { "text": translationService.translate('Properties'), "action": () => launchPluginPropertyWindow(item.plugin, windowManager) },
      { "text": translationService.translate("Close All"), "action": ()=> closeAllWindows(item, windowManager)}
    ];
  } else {
    menuItems =
      [
      { "text": translationService.translate('Open'), "action": () => openWindow(item, applicationManager) },
      { "text" : translationService.translate("Open in New Browser Tab"), "action": () => openStandalone(item)},
      pluginsDataService.pinContext(item),
      { "text": translationService.translate('Properties'), "action": () => launchPluginPropertyWindow(item.plugin, windowManager) },
    ]
  }
  return menuItems;
}
