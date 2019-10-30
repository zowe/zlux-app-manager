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
var curResponseKey = 0;
var numUnresolved = 0;
var instanceId = -1;
var DEFAULT_GET_LOGGER_TIMEOUT = 3000;
var parentLogger = null;

// This function uses setTimeout due to the fact that the Logger class must be included in the html script, and therefore 
// is not guaranteed to load before this script
function initLogger(maxRetries, timeout){
    if(typeof getLogger.retries === 'undefined'){
        getLogger.retries = 0;
    }
    if(exports && exports.Logger){
        console.log('Initialized Logger')
        parentLogger = new exports.Logger();
        parentLogger.addDestination(parentLogger.makeDefaultDestination(true, true, true))
        return;
    }
    setTimeout(() => {
        if(getLogger.retries > maxRetries){
            console.log('Unable to initialize Logger')
            return;
        }
        if(exports === {} || exports.Logger === undefined){
            getLogger.retries++;
            getLogger(maxRetries, timeout);
        }
    }, timeout);
}

initLogger(5, DEFAULT_GET_LOGGER_TIMEOUT);

let messageHandler = function(message) {
    if(message.data.dispatchData){
        if(instanceId === -1 && message.data.dispatchData.instanceId !== undefined){
            instanceId = message.data.dispatchData.instanceId;
            translateFunction('registerAdapterInstance', []);
        }
    }
    if(message.data.key === undefined || message.data.instanceId != instanceId) return;
    let data = message.data;
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

function getPluginDef(){
    return translateFunction('getPluginDefinition', []);
}

function getLaunchMetadata(){
    return translateFunction('getLaunchMetadata', []);
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
    logger: {
        makeComponentLogger(componentName, messages){
            return parentLogger.makeComponentLogger(componentName, messages);
        },
        setLogLevelForComponentName(componentName, level){
            return parentLogger.setLogLevelForComponentName(componentName, level);
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

var viewportEvents = {
    registerCloseHandler(handler){
        return translateFunction('viewportEvents.registerCloseHandler', [handler])
    }
}