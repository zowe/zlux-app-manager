/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/



/* JS within an iframe can reference objects of the page it is embedded in via window.parent.
   With ZLUX, there's a global called ZoweZLUX which holds useful tools. So, a site
   Can determine what actions to take by knowing if it is or isnt embedded in ZLUX via IFrame.
*/

let messageHandler = function(message) {
    let data = message.data;
    if(data.dispatchData){
        if(ZoweZLUX.iframe.instanceId === -1 && data.dispatchData.instanceId !== undefined){
            ZoweZLUX.iframe.instanceId = data.dispatchData.instanceId;
            translateFunction('registerAdapterInstance', []);
        } else if(ZoweZLUX.iframe.instanceId !== -1 && data.dispatchData.instanceId !== undefined 
                    && data.dispatchData.instanceId !== ZoweZLUX.iframe.instanceId){
            console.warn('ZWED5000W - Desktop attempted to change instanceId for iframe instance=', ZoweZLUX.iframe.instanceId, 'message=', message);
        }
    }
    if(data.key === undefined || data.instanceId != ZoweZLUX.iframe.instanceId) return;
    if(data.constructorData){
        ZoweZLUX.iframe.pluginDef = data.constructorData.pluginDef;
        ZoweZLUX.iframe.launchMetadata = data.constructorData.launchMetadata;
    }
    let key = data.key
    if(ZoweZLUX.iframe.__iframeAdapter.__responses[key]){
        ZoweZLUX.iframe.__iframeAdapter.__responses[key].resolve(data.value);
        delete ZoweZLUX.iframe.__iframeAdapter.__responses[key];
        ZoweZLUX.iframe.__iframeAdapter.__numUnresolved--;
    } else {
        switch(data.originCall){
            case 'handleMessageAdded':
                ZoweZLUX.iframe.__iframeAdapter.__these[data.instanceId].handleMessageAdded(data.notification);
                return;
            case 'handleMessageRemoved':
                ZoweZLUX.iframe.__iframeAdapter.__these[data.instanceId].handleMessageRemoved(data.notificationId);
                return;
            case 'viewportEvents.spawnContextMenu':
            case 'windowActions.spawnContextMenu':
                if(data.contextMenuItemIndex !== undefined){
                    ZoweZLUX.iframe.contextMenuActions[key][data.contextMenuItemIndex].action();
                    delete ZoweZLUX.iframe.contextMenuActions[key];
                }
                return;
            case 'viewportEvents.callCloseHandler':
                ZoweZLUX.iframe.closeHandlers[key]().then((res) => {
                    delete ZoweZLUX.iframe.closeHandlers[key]
                    translateFunction('resolveCloseHandler', [key])
                })
                return;
            //The following cases should be implemented by the user,
            //therefore users will need an eventListener for "message" events
            case 'windowEvents.minimized':
                let minimized = new CustomEvent('ZoweZLUX.windowEvents', {detail: {event:'minimized'}});
                window.dispatchEvent(minimized);
                return;
            case 'windowEvents.maximized':
                let maximized = new CustomEvent('ZoweZLUX.windowEvents', {detail: {event:'maximized'}});
                window.dispatchEvent(maximized);
                return;
            case 'windowEvents.restored':
                let restored = new CustomEvent('ZoweZLUX.windowEvents', {detail: {event:'restored'}});
                window.dispatchEvent(restored)
                return;
            case 'windowEvents.resized':
                //console.log('resized')
                return;
            case 'windowEvents.titleChanged':
                let titleChanged = new CustomEvent('ZoweZLUX.windowEvents', {detail: {event:'titleChange'}});
                window.dispatchEvent(titleChanged);
                return;
            case 'sessionEvents.login':
                let login = new CustomEvent('ZoweZLUX.sessionEvents', {detail: {event:'login'}});
                window.dispatchEvent(login);
                return;
            case 'sessionEvents.sessionExpire':
                let sessionExpire = new CustomEvent('ZoweZLUX.sessionEvents', {detail: {event:'sessionExpire'}});
                window.dispatchEvent(sessionExpire);
                return;
            case 'sessionEvents.autosaveEmitter':
                let autosaveEmitter = new CustomEvent('ZoweZLUX.sessionEvents', {detail: {event:'autosaveEmitter'}});
                window.dispatchEvent(autosaveEmitter);
                return;
            default:
                return;
        }
    }
    if(ZoweZLUX.iframe.__iframeAdapter.__numUnresolved < 1){
        ZoweZLUX.iframe.__iframeAdapter.__responses = {};
    }
}

window.addEventListener('message', messageHandler);

window.addEventListener("load", function () {
    console.log('ZWED5009I - iFrame Adapter has loaded!');
    window.top.postMessage('iframeload', '*');
});

window.addEventListener("unload", function () {
    this.removeEventListener('message', messageHandler)
});


function translateFunction(functionString, args){
    return new Promise((resolve, reject) => {
        if(typeof functionString !== 'string' || !Array.isArray(args)){
            reject({
                error: "ZWED5013E - functionString must be of type string, args must be an array of type object"
            })
        }
        const key = ZoweZLUX.iframe.__iframeAdapter.__curResponseKey++;
        switch(functionString){
            case 'ZoweZLUX.notificationManager.addMessageHandler':
                if(args[0] !== undefined){
                    ZoweZLUX.iframe.__iframeAdapter.__these[ZoweZLUX.iframe.instanceId] = args[0];
                    args[0] = {}
                }
                break;
            case 'windowActions.spawnContextMenu':
                if(args.length > 0 && Array.isArray(args[2])){
                    ZoweZLUX.iframe.contextMenuActions[key] = args[2];
                    args[2] = removeActionsFromContextMenu(args[2]);
                }
                break;
            case 'viewportEvents.registerCloseHandler':
                if(args[0] !== undefined){
                    ZoweZLUX.iframe.closeHandlers[key] = args[0];
                    args[0] = {};
                }
                break;
            default:
                break;
        }
        const request = {
            function: functionString,
            args: args,
            instanceId: ZoweZLUX.iframe.instanceId
        }
        ZoweZLUX.iframe.__iframeAdapter.__numUnresolved++;
        ZoweZLUX.iframe.__iframeAdapter.__responses[key] = {
            resolve: function(res){
                resolve(res);
            }
        }
        window.top.postMessage({key, request}, '*');
    })
}

function removeActionsFromContextMenu(itemsArray){
    //TODO: change implementation once children actions are fixed
    let copy = JSON.parse(JSON.stringify(itemsArray));
    for(let i = 0; i < copy.length; i++){
        if(copy[i].children){
            copy[i].children = removeActionsFromContextMenu(copy[i].children)
        }
        copy[i].action = {}
    }
    return copy;
}

var ZoweZLUX = {
    iframe: {
        //Not meant to be touched
        __iframeAdapter: {
            __responses: {},
            __these: {}, //contains this'
            __curResponseKey: 0,
            __numUnresolved: 0,
        },
        instanceId: -1,
        contextMenuActions: {},
        closeHandlers: {},
        pluginDef: undefined,
        launchMetadata: undefined,

        //True - Standalone, False - We are in regular desktop mode
        isSingleAppMode() {
            return new Promise(function(resolve, reject)  {
                if (window.GIZA_SIMPLE_CONTAINER_REQUESTED) { //Ancient edgecase
                    resolve(true); //Standalone mode
                } else {
                let intervalId = setInterval(checkForStandaloneMode, 100);
                function checkForStandaloneMode() {
                    if (ZoweZLUX.iframe.pluginDef) { //If we have the plugin definition
                        clearInterval(intervalId);
                        resolve(false);
                    }
                }
                setTimeout(() => { 
                    clearInterval(intervalId);
                    if (ZoweZLUX.iframe.pluginDef === undefined || null) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }, 1000);
                }
            });
        }
    },
    pluginManager: {
        getPlugin(id){
            return translateFunction('ZoweZLUX.pluginManager.getPlugin', [id])
        },
        loadPlugins(pluginType, update){
            return translateFunction('ZoweZLUX.pluginManager.loadPlugins', Array.prototype.slice.call(arguments))
        },
      /*  These are omitted because they do not seem like something an iframe should modify
        setDesktopPlugin(plugin){

        },
        includeScript(scriptUrl){

        },
        getDesktopPlugin(){

        }
      */
    },
    uriBroker: {
        desktopRootUri(){
            return translateFunction('ZoweZLUX.uriBroker.desktopRootUri', [])
        },
        datasetMetadataHlqUri(updateCache, types, workAreaSize, resumeName, resumeCatalogName){
            return translateFunction('ZoweZLUX.uriBroker.datasetMetadataHlqUri', Array.prototype.slice.call(arguments))
        },
        datasetMetadataUri(dsn, detail, types, listMembers, workAreaSize, includeMigrated, includeUnprintable,
                                    resumeName, resumeCatalogName, addQualifiers){
          return translateFunction('ZoweZLUX.uriBroker.datasetMetadataUri', Array.prototype.slice.call(arguments))
        },
        datasetContentsUri(dsn){
          return translateFunction('ZoweZLUX.uriBroker.datasetContentsUri', Array.prototype.slice.call(arguments))
        },
        VSAMdatasetContentsUri(dsn, closeAfter){
          return translateFunction('ZoweZLUX.uriBroker.VSAMdatasetContentsUri', Array.prototype.slice.call(arguments))
        },
        unixFileUri(route, absPath, sourceEncodingOrOptions, targetEncoding, newName, forceOverwrite, sessionID, 
            lastChunk, responseType, mode, recursive, user, group, type, codeset){
          return translateFunction('ZoweZLUX.uriBroker.unixFileUri', Array.prototype.slice.call(arguments))
        },
        omvsSegmentUri(){
          return translateFunction('ZoweZLUX.uriBroker.omvsSegmentUri', Array.prototype.slice.call(arguments))
        },
        rasUri(uri){
          return translateFunction('ZoweZLUX.uriBroker.rasUri', Array.prototype.slice.call(arguments))
        },
        serverRootUri(uri){
          return translateFunction('ZoweZLUX.uriBroker.serverRootUri', Array.prototype.slice.call(arguments))
        },
        pluginResourceUri(pluginDefinition, relativePath){
          return translateFunction('ZoweZLUX.uriBroker.pluginResourceUri', Array.prototype.slice.call(arguments))
        },
        pluginListUri(pluginType, update){
          return translateFunction('ZoweZLUX.uriBroker.pluginListUri', Array.prototype.slice.call(arguments))
        },
        pluginConfigForScopeUri(pluginDefinition, scope, resourcePath, resourceName){
          return translateFunction('ZoweZLUX.uriBroker.pluginConfigForScopeUri', Array.prototype.slice.call(arguments))
        },
        pluginConfigUri(pluginDefinition, resourcePath, resourceName){
            return translateFunction('ZoweZLUX.uriBroker.pluginConfigUri', Array.prototype.slice.call(arguments))
        },
        pluginWSUri(pluginDefinition, serviceName, relativePath, version){
            return translateFunction('ZoweZLUX.uriBroker.pluginWSUri', Array.prototype.slice.call(arguments))
        },
        pluginRESTUri(pluginDefinition, serviceName, relativePath, version){
            return translateFunction('ZoweZLUX.uriBroker.pluginRESTUri', Array.prototype.slice.call(arguments))
        }
    },
    dispatcher: {
        constants: {
            ActionType: {
                Launch: 0,
                Focus: 1,
                Route: 2,
                Message: 3,
                Method: 4,
                Minimize: 5,
                Maximize: 6,
                Close: 7,
                CreateChannel: 8
            },
            ActionTargetMode: {
                PluginCreate: 0,
                PluginFindUniqueOrCreate: 1,
                PluginFindAnyOrCreate: 2,
                System: 3
            }
        },
        getAbstractActionById(actionId){
            return translateFunction('ZoweZLUX.dispatcher.getAbstractActionById', [actionId]);
        },
        getAbstractActions(capabilities, applicationContext){
            return translateFunction('ZoweZLUX.dispatcher.getAbstractActions', [capabilities, applicationContext]);
        },
        makeAction(id, defaultName, targetMode, type, targetPluginID, primaryArg){
            return translateFunction('ZoweZLUX.dispatcher.makeAction', [id, defaultName, targetMode, type, targetPluginID, primaryArg])
        },
        makeActionFromObject(actionObject){
            return translateFunction('ZoweZLUX.dispatcher.makeActionFromObject', [actionObject]);
        },
        invokeAction(action, eventContext, targetId){
            return translateFunction('ZoweZLUX.dispatcher.invokeAction', [action, eventContext, targetId])
        },
        registerAction(action){
            return translateFunction('ZoweZLUX.dispatcher.registerAction', [action]);
        },
        registerAbstractAction(action){
            return translateFunction('ZoweZLUX.dispatcher.registerAbstractAction', [action]);
        }
    },
    registry: {

    },
    notificationManager: {
        notify(notification){
            return translateFunction('ZoweZLUX.notificationManager.notify', [notification])
        },
        serverNotify(message){
            return translateFunction('ZoweZLUX.notificationManager.serverNotify', [message])
        },
        dismissNotification(id){
            return translateFunction('ZoweZLUX.notificationManager.dismissNotification', [id])
        },
        removeAll(){
            return translateFunction('ZoweZLUX.notificationManager.removeAll', [])
        },
        getCount(){
            return translateFunction('ZoweZLUX.notificationManager.getCount', [])
        },
        addMessageHandler(object){
            return translateFunction('ZoweZLUX.notificationManager.addMessageHandler', [object])
        },
        removeMessageHandler(object){
            return translateFunction('ZoweZLUX.notificationManager.removeMessageHandler', [object])
        },
        createNotification(title, message, type, plugin){
            return translateFunction('ZoweZLUX.notificationManager.createNotification', [title, message, type, plugin])
        }
    },
    globalization: {
        getLanguage(){
            return translateFunction('ZoweZLUX.globalization.getLanguage', [])
        },
        getLocale(){
            return translateFunction('ZoweZLUX.globalization.getLocale', [])
        },
        setLanguage(language){
            return translateFunction('ZoweZLUX.globalization.setLanguage', [language])
        },
        setLocale(locale){
            return translateFunction('ZoweZLUX.globalization.setLocale', [locale])
        }
    }
}

ZoweZLUX.logger = new exports.Logger();
ZoweZLUX.logger.addDestination(ZoweZLUX.logger.makeDefaultDestination(true, true, true, true, true))
var exports = (ZoweZLUX_tempExports) ? ZoweZLUX_tempExports : exports;

var windowActions = {
    close(){
        return translateFunction('windowActions.close', [])
    },
    minimize(){
        return translateFunction('windowActions.minimize', [])
    },
    maximize(){
        return translateFunction('windowActions.maximize', [])
    },
    restore(){
        return translateFunction('windowActions.restore', [])
    },
    setTitle(title){
        return translateFunction('windowActions.setTitle', Array.prototype.slice.call(arguments))
    },
    setPosition(pos){
        return translateFunction('windowActions.setPosition', [pos])
    },
    spawnContextMenu(xPos, yPos, items, isAbsolutePos){
        return translateFunction('windowActions.spawnContextMenu', [xPos, yPos, items, isAbsolutePos])
    },
}
ZoweZLUX.iframe.windowActions = windowActions;
var viewportEvents = {
    registerCloseHandler(handler){
        return translateFunction('viewportEvents.registerCloseHandler', [handler])
    }
}
ZoweZLUX.iframe.viewportEvents = viewportEvents;
