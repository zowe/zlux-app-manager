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

var IFRAME_NAME_PREFIX = 'mvd_iframe_';
var INNER_IFRAME_NAME = 'zluxIframe';
var mvdWindow = window.parent;
var responses = [];
var notifications = [];
var logger = undefined;

window.addEventListener('message', function(message) {
    if (message.data.key === undefined) return;
    responses[message.data.key](message.data.value);
    delete responses[message.key];
})

const requestStructure = {
    function: 'string',
    args: 'object'
}

function makeRequest(request){
    return new Promise((resolve, reject) => {
        const key = responses.length;
        responses.push((res) => {
            resolve(res);
        });
        window.top.postMessage({key, request}, '*');
    })
}

function translateFunction(functionString, args){
    if(typeof functionString !== 'string' || !Array.isArray(args)){
        return undefined;
    }
    return new Promise((resolve, reject) => {
        makeRequest({
            function: functionString,
            args: args
        }).then((res) => {
            console.log('iframe-adapter translateFunctionCall() res: ', res);
            resolve(res);
        })
    })
}

window.addEventListener("load", function () {
    console.log('Loading iframe adapter instance');
    this.window.top.postMessage('iframeload', '*');
  }, false);

var ZoweZLUX = {
    notificationManager: {
        notify: function(notification){
            translateFunction('ZoweZLUX.notificationManager.notify', [notification]).then(res => { return res })
        },
        serverNotify: function(message){
            translateFunction('ZoweZLUX.notificationManager.serverNotify', [message]).then(res => { return res })
        },
        dismissNotification: function(id){
            translateFunction('ZoweZLUX.notificationManager.dismissNotification', [id])
        },
        removeAll: function(){
            translateFunction('ZoweZLUX.notificationManager.removeAll', [])
        },
        getCount: function(){
            translateFunction('ZoweZLUX.notificationManager.getCount', []).then(res => { return res })
        },
        addMessageHandler: function(object){
            translateFunction('ZoweZLUX.notificationManager.addMessageHandler', [object])
        },
        removeMessageHandler: function(object){
            translateFunction('ZoweZLUX.notificationManager.removeMessageHandler', [object])
        },
        createNotification: function(title, message, type, plugin){
            translateFunction('ZoweZLUX.notificationManager.createNotification', [title, message, type, plugin])
                .then((res) => { return res })
        }
    }
}