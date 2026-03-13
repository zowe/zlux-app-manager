var isReady = false
var pluginDef;

window.addEventListener('message', (message)=> {
  const data = message.data;
  if(data.constructorData){
    pluginDef = data.constructorData.pluginDef.basePlugin;
    if (ready) {
      greeting();
    }
  }
});

function ready() {
  isReady = true;
  if (ZoweZLUX) {
    ZoweZLUX.iframe.windowActions.setTitle(`Hello, world!`);
  }
  if (pluginDef) {
    greeting();
  }
};

function greeting() {
  const message = `Welcome to ${pluginDef.webContent.descriptionDefault} (${pluginDef.identifier})`;
  document.getElementById('message').innerHTML = message;
  const logger = ZoweZLUX.logger.makeComponentLogger(pluginDef.identifier);
  logger.info(message);
}
