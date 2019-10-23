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

var responses = {};
var these = {}; //contains this'
var contextMenuActions = {};
var curResponseKey = 0;
var numUnresolved = 0;
var instanceId = -1;

let messageHandler = function(message) {
    if(message.data.dispatchData){
        if(instanceId === -1 && message.data.dispatchData.instanceId !== undefined){
            instanceId = message.data.dispatchData.instanceId;
            translateFunction('registerAdapterInstance', []);
        }
    }
    if(message.data.key === undefined || message.data.instanceId != instanceId) return;
    let key = message.data.key
    if(responses[key]){
        responses[key].resolve(message.data.value);
        delete responses[key];
        numUnresolved--;
    } else {
        switch(message.data.originCall){
            case 'handleMessageAdded':
                these[message.data.instanceId].handleMessageAdded(message.data.notification);
                return;
            case 'handleMessageRemoved':
                these[message.data.instanceId].handleMessageRemoved(message.data.notificationId);
                return;
            case 'windowActions.spawnContextMenu':
                if(message.data.contextMenuItemIndex !== undefined){
                    contextMenuActions[key][message.data.contextMenuItemIndex].action();
                    delete contextMenuActions[key];
                }
                return;
            //The following cases should be implemented by the user,
            //therefore users will need an eventListener for "message" events
            case 'windowEvents.minimized':
                console.log('minimized')
                return;
            case 'windowEvents.maximized':
                console.log('maximized')
                return;
            case 'windowEvents.restored':
                console.log('restored')
                return;
            case 'windowEvents.moved':
                console.log('moved')
                return;
            case 'windowEvents.resized':
                console.log('resized')
                return;
            case 'windowEvents.titleChanged':
                console.log('titleChanged')
                return;
            default:
                return;
        }
    }
    if(numUnresolved < 1){
        responses = {};
    }
}

window.addEventListener("load", function () {
    console.log('iFrame Adapter has loaded!');
    window.top.postMessage('iframeload', '*');
});

window.addEventListener("unload", function () {
    this.removeEventListener('message', messageHandler)
});

window.addEventListener('message', messageHandler);

function translateFunction(functionString, args){
    return new Promise((resolve, reject) => {
        if(typeof functionString !== 'string' || !Array.isArray(args)){
            reject({
                error: "functionString must be of type string, args must be an array of type object"
            })
        }
        const key = curResponseKey++;
        switch(functionString){
            case 'ZoweZLUX.notificationManager.addMessageHandler':
                if(args.length === 1){
                    these[instanceId] = args[0];
                    args[0] = 'this'
                }
                break;
            case 'windowActions.spawnContextMenu':
                if(args.length > 0 && Array.isArray(args[2])){
                    contextMenuActions[key] = args[2];
                    args[2] = removeActionsFromContextMenu(args[2]);
                }
                break;
            default:
                break;
        }
        const request = {
            function: functionString,
            args: args,
            instanceId: instanceId
        }
        numUnresolved++;
        responses[key] = {
            resolve: function(res){
                resolve(res);
            }
        }
        window.top.postMessage({key, request}, '*');
    })
}

function removeActionsFromContextMenu(itemsArray){
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
    pluginManager: {
        getPlugin: function(id){
            return translateFunction('ZoweZLUX.pluginManager.getPlugin', [id])
        },
        loadPlugins: function(pluginType){

        },
        setDesktopPlugin: function(plugin){

        },
        includeScript: function(scriptUrl){

        },
        getDesktopPlugin: function(){

        }
    },
    uriBroker: {
        desktopRootUri: function(){
            return translateFunction('ZoewZLUX.uriBroker.desktopRootUri', [])
        },
        datasetMetadataHlqUri: function(updateCache, types, workAreaSize, resumeName, resumeCatalogName){

        },
        datasetMetadataUri: function(dsn, detail, types, listMembers, workAreaSize, includeMigrated, includeUnprintable,
                                    resumeName, resumeCatalogName, addQualifiers){
            
        },
        datasetContentsUri: function(dsn){

        },
        VSAMdatasetContentsUri: function(dsn, closeAfter){

        },
        unixFileUri: function(route, absPath, sourceEncodingOrOptions,
                            targetEncoding, newName, forceOverwrite, sessionID, lastChunk, responseType){

        },
        omvsSegmentUri: function(){

        },
        rasUri: function(uri){

        },
        serverRootUri: function(uri){

        },
        pluginResourceUri: function(pluginDefinition, relativePath){

        },
        pluginListUri: function(pluginType){

        },
        pluginConfigForScopeUri: function(pluginDefinition, scope, resourcePath, resourceName){

        },
        pluginConfigUri: function(pluginDefinition, resourcePath, resourceName){
            return translateFunction('ZoweZLUX.uriBroker.pluginConfigUri', [pluginDefinition, resourcePath, resourceName])
        },
        pluginWSUri: function(pluginDefinition, serviceName, relativePath, version){

        },
        pluginRESTUri: function(pluginDefinition, serviceName, relativePath, version){
            return translateFunction('ZoweZLUX.uriBroker.pluginRESTUri', [pluginDefinition, serviceName, relativePath, version])
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
        makeAction: function(id, defaultName, targetMode, type, targetPluginID, primaryArg){
            return translateFunction('ZoweZLUX.dispatcher.makeAction', [id, defaultName, targetMode, type, targetPluginID, primaryArg])
        },
        invokeAction: function(action, eventContext, targetId){
            return translateFunction('ZoweZLUX.dispatcher.invokeAction', [action, eventContext, targetId])
        }
    },
    logger: {

    },
    registry: {

    },
    notificationManager: {
        notify: function(notification){
            return translateFunction('ZoweZLUX.notificationManager.notify', [notification])
        },
        serverNotify: function(message){
            return translateFunction('ZoweZLUX.notificationManager.serverNotify', [message])
        },
        dismissNotification: function(id){
            return translateFunction('ZoweZLUX.notificationManager.dismissNotification', [id])
        },
        removeAll: function(){
            return translateFunction('ZoweZLUX.notificationManager.removeAll', [])
        },
        getCount: function(){
            return translateFunction('ZoweZLUX.notificationManager.getCount', [])
        },
        addMessageHandler: function(object){
            return translateFunction('ZoweZLUX.notificationManager.addMessageHandler', [object])
        },
        removeMessageHandler: function(object){
            return translateFunction('ZoweZLUX.notificationManager.removeMessageHandler', [object])
        },
        createNotification: function(title, message, type, plugin){
            return translateFunction('ZoweZLUX.notificationManager.createNotification', [title, message, type, plugin])
        }
    },
    globalization: {
        getLanguage: function(){
            return translateFunction('ZoweZLUX.globalization.getLanguage', [])
        },
        getLocale: function(){
            return translateFunction('ZoweZLUX.globalization.getLocale', [])
        },
        setLanguage: function(language){
            return translateFunction('ZoweZLUX.globalization.setLanguage', [language])
        },
        setLocale: function(locale){
            return translateFunction('ZoweZLUX.globalization.setLocale', [locale])
        }
    }
}

var windowActions = {
    close: function(){
        return translateFunction('windowActions.close', [])
    },
    minimize: function(){
        return translateFunction('windowActions.minimize', [])
    },
    maximize: function(){
        return translateFunction('windowActions.maximize', [])
    },
    restore: function(){
        return translateFunction('windowActions.restore', [])
    },
    setTitle: function(title){
        return translateFunction('windowActions.setTitle', [title])
    },
    setPosition: function(pos){
        return translateFunction('windowActions.setPosition', [pos])
    },
    spawnContextMenu: function(xPos, yPos, items, isAbsolutePos){
        return translateFunction('windowActions.spawnContextMenu', [xPos, yPos, items, isAbsolutePos])
    }
}