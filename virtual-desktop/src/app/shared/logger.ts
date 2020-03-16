/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

const baseLoggerIdentifier = 'org.zowe.zlux.ng2desktop' //the one hardcoded place
export var BaseLogger: any = ZoweZLUX.logger.makeComponentLogger(baseLoggerIdentifier);

let lang = ZoweZLUX.globalization.getLanguage();
let plugin = ZoweZLUX.pluginManager.getDesktopPlugin();
let messageLoc = ZoweZLUX.uriBroker.pluginResourceUri(plugin, `assets/i18n/log/messages_${lang}.json`);

fetch(messageLoc) // Attempt to find log messages for global language
.then((resp) => resp.json())
.then(function(messages) {
    BaseLogger._setMessages(messages);
    afterBaseLoggerInit();
})
  .catch(function() { // If it doesn't work...
    if (lang != 'en') {
      lang = "en"; // Try English log messages (default)
      messageLoc = ZoweZLUX.uriBroker.pluginResourceUri(plugin, `assets/i18n/log/messages_${lang}.json`);

      fetch(messageLoc)
        .then((resp) => resp.json())
        .then(function(messages) {
          BaseLogger._setMessages(messages);
          afterBaseLoggerInit();
        })
        .catch(function() { // If that still doesn't work, just do nothing...
          afterBaseLoggerInit();
        });
    } else {
      afterBaseLoggerInit();
    }
});

function afterBaseLoggerInit() {
  BaseLogger.info(`ZWED5321I`, navigator.userAgent); //BaseLogger.info(`App framework initializing. User agent=${navigator.userAgent}`);
}
