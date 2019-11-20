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
var closeHandlers = {};
var pluginDef = undefined;
var launchMetadata = undefined;
var curResponseKey = 0;
var numUnresolved = 0;
var instanceId = -1;

let messageHandler = function(message) {
    let data = message.data;
    if(data.dispatchData){
        if(instanceId === -1 && data.dispatchData.instanceId !== undefined){
            instanceId = data.dispatchData.instanceId;
            translateFunction('registerAdapterInstance', []);
        } else if(instanceId !== -1 && data.dispatchData.instanceId !== undefined 
                    && data.dispatchData.instanceId !== instanceId){
            console.warn('Desktop attempted to change instanceId for iframe instance=', instanceId, 'message=', message);
        }
    }
    if(data.key === undefined || data.instanceId != instanceId) return;
    if(data.constructorData){
        pluginDef = data.constructorData.pluginDef;
        launchMetadata = data.constructorData.launchMetadata;
    }
    let key = data.key
    if(responses[key]){
        responses[key].resolve(data.value);
        delete responses[key];
        numUnresolved--;
    } else {
        switch(data.originCall){
            case 'handleMessageAdded':
                these[data.instanceId].handleMessageAdded(data.notification);
                return;
            case 'handleMessageRemoved':
                these[data.instanceId].handleMessageRemoved(data.notificationId);
                return;
            case 'windowActions.spawnContextMenu':
                if(data.contextMenuItemIndex !== undefined){
                    contextMenuActions[key][data.contextMenuItemIndex].action();
                    delete contextMenuActions[key];
                }
                return;
            case 'viewportEvents.callCloseHandler':
                closeHandlers[key]().then((res) => {
                    delete closeHandlers[key]
                    translateFunction('resolveCloseHandler', [key])
                })
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
                //console.log('moved')
                return;
            case 'windowEvents.resized':
                //console.log('resized')
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

window.addEventListener('message', messageHandler);

window.addEventListener("load", function () {
    console.log('iFrame Adapter has loaded!');
    window.top.postMessage('iframeload', '*');
});

window.addEventListener("unload", function () {
    this.removeEventListener('message', messageHandler)
});


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
                if(args[0] !== undefined){
                    these[instanceId] = args[0];
                    args[0] = {}
                }
                break;
            case 'windowActions.spawnContextMenu':
                if(args.length > 0 && Array.isArray(args[2])){
                    contextMenuActions[key] = args[2];
                    args[2] = removeActionsFromContextMenu(args[2]);
                }
                break;
            case 'viewportEvents.registerCloseHandler':
                if(args[0] !== undefined){
                    closeHandlers[key] = args[0];
                    args[0] = {};
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
    pluginManager: {
        getPlugin(id){
            return translateFunction('ZoweZLUX.pluginManager.getPlugin', [id])
        },
        loadPlugins(pluginType){

        },
        setDesktopPlugin(plugin){

        },
        includeScript(scriptUrl){

        },
        getDesktopPlugin(){

        }
    },
    uriBroker: {
        desktopRootUri(){
            return translateFunction('ZoweZLUX.uriBroker.desktopRootUri', [])
        },
        datasetMetadataHlqUri(updateCache, types, workAreaSize, resumeName, resumeCatalogName){

        },
        datasetMetadataUri(dsn, detail, types, listMembers, workAreaSize, includeMigrated, includeUnprintable,
                                    resumeName, resumeCatalogName, addQualifiers){
            
        },
        datasetContentsUri(dsn){

        },
        VSAMdatasetContentsUri(dsn, closeAfter){

        },
        unixFileUri(route, absPath, sourceEncodingOrOptions,
                            targetEncoding, newName, forceOverwrite, sessionID, lastChunk, responseType){

        },
        omvsSegmentUri(){

        },
        rasUri(uri){

        },
        serverRootUri(uri){

        },
        pluginResourceUri(pluginDefinition, relativePath){

        },
        pluginListUri(pluginType){

        },
        pluginConfigForScopeUri(pluginDefinition, scope, resourcePath, resourceName){

        },
        pluginConfigUri(pluginDefinition, resourcePath, resourceName){
            return translateFunction('ZoweZLUX.uriBroker.pluginConfigUri', [pluginDefinition, resourcePath, resourceName])
        },
        pluginWSUri(pluginDefinition, serviceName, relativePath, version){

        },
        pluginRESTUri(pluginDefinition, serviceName, relativePath, version){
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
        makeAction(id, defaultName, targetMode, type, targetPluginID, primaryArg){
            return translateFunction('ZoweZLUX.dispatcher.makeAction', [id, defaultName, targetMode, type, targetPluginID, primaryArg])
        },
        invokeAction(action, eventContext, targetId){
            return translateFunction('ZoweZLUX.dispatcher.invokeAction', [action, eventContext, targetId])
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
        return translateFunction('windowActions.setTitle', [title])
    },
    setPosition(pos){
        return translateFunction('windowActions.setPosition', [pos])
    },
    spawnContextMenu(xPos, yPos, items, isAbsolutePos){
        return translateFunction('windowActions.spawnContextMenu', [xPos, yPos, items, isAbsolutePos])
    },
}

//True - Standalone, False - We are in regular desktop mode
function isSingleAppMode() {
    return new Promise(function(resolve, reject)  {
        if (window.GIZA_SIMPLE_CONTAINER_REQUESTED) { //Ancient edgecase
            resolve(true); //Standalone mode
        } else {
        let intervalId = setInterval(checkForStandaloneMode, 100);
        function checkForStandaloneMode() {
            if (pluginDef) { //If we have the plugin definition
                clearInterval(intervalId);
                resolve(false);
            }
        }
        setTimeout(() => { 
            clearInterval(intervalId);
            if (pluginDef === undefined || null) {
                resolve(true);
            } else {
                resolve(false);
            }
        }, 1000);
        }
    });
}

var viewportEvents = {
    registerCloseHandler(handler){
        return translateFunction('viewportEvents.registerCloseHandler', [handler])
    }
}