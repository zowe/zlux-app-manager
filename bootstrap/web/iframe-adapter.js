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
var curResponseKey = 0;
var numUnresolved = 0;

window.addEventListener('message', function(message) {
    if (message.data.key === undefined) return;
    if(responses[message.data.key]){
        responses[message.data.key].resolve(message.data.value);
        delete responses[message.data.key];
        numUnresolved--;
    }
    if(numUnresolved < 1){
        responses = {};
    }
})

function translateFunction(functionString, args){
    return new Promise((resolve, reject) => {
        if(typeof functionString !== 'string' || !Array.isArray(args)){
            reject({
                error: "functionString must be of type string, args must be an array of type object"
            })
        }
        const key = curResponseKey++;
        const request = {
            function: functionString,
            args: args
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

window.addEventListener("load", function () {
    console.log('Loading iframe adapter instance');
    this.window.top.postMessage('iframeload', '*');
  }, false);

var ZoweZLUX = {
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
    }
}