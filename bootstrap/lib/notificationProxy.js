const express = require('express');
const Promise = require('bluebird');
const expressWs = require('express-ws');
const expressWs2 = expressWs(express());

// function NotificationWebsocketProxy(messageConfig, clientIP, context, websocket, handlers) {
//     websocket.on('error', (error) => {
//       this.logger.warn("websocket error", error);
//       this.closeConnection(websocket, WEBSOCKET_REASON_NOTIFICATION_PROXY_INTERNAL_ERROR, 'websocket error occurred');
//     });
//     websocket.on('close',(code,reason)=>{this.handleWebsocketClosed(code,reason);});
  
//     this.handlers = handlers;
//     this.host;
//     this.hostPort;
//     this.hostSocket;
//     this.usingSSH = false;
//     this.sshSessionData;
//     this.hostConnected = false;
//     this.clientIP = clientIP;
//     this.logger = context.logger;
//     this.bufferedHostMessages = []; //while awaiting certificate verification
//     this.ws = websocket;
//     if (messageConfig
//         && messageConfig.hostTypeKey
//         && messageConfig.hostDataKey
//         && messageConfig.clientTypeKey
//         && messageConfig.clientDataKey) {
//       this.hostTypeKey = messageConfig.hostTypeKey;
//       this.hostDataKey = messageConfig.hostDataKey;
//       this.clientTypeKey = messageConfig.clientTypeKey;
//       this.clientDataKey = messageConfig.clientDataKey;
  
//       websocket.on('message',(msg)=>{this.handleWebsocketMessage(msg);});
//       this.configured = true;
//     }
//     else {
//       this.logger.warn('Notification websocket proxy was not supplied with valid message config description');
//     }
// }
  

exports.adminNotificationWebsocketRouter = function(context) {
    /* 
      a handler is an external component for interpreting messages of types or in ways not covered in this code alone
      a handler is given the data and returns  a JSON response which includes whether to continue or not
      requires: wsmessage, this
      returns: {response: {}, continue: true/false}
      if malformed, continues.
      handlers can come from /lib for now.
    */
    // let handlers = scanAndImportHandlers(context.logger);
    let count = 0;
    var aWss = expressWs2.getWss();
    let clients = [];

    return new Promise(function(resolve, reject) {
    //   let securityConfig = context.plugin.server.config.user.node.https;
    //   if (securityConfig && !NotificationWebsocketProxy.securityObjects) {
        // createSecurityObjects(securityConfig,context.logger);
    //   }
  
      let router = express.Router();  
      router.use(function abc(req,res,next) {
        context.logger.info('Saw Websocket request, method='+req.method);
        // var connection = req.accept('any-protocol', request.origin);
        // context.logger.info(connection);
        next();
      });
      router.ws('/',function(ws,req) {
        // context.logger.info(ws)
        // context.logger.info(req)
        // context.logger.info(req.client)
        // context.logger.info(req.cookies)
        // context.logger.info(req.clients)

        context.logger.info("yayayaya")
        clients.push(ws)
        ws.on('open',()=>{
            // ws.send("hey")
            // aWss.clients.forEach(function (client) {
            //     client.send(count);
            // });
            context.logger.info("yaya")
        });

        ws.on('message', ()=>{
            count = count + 1;
            context.logger.info('tetsetsteest')
            // if (message.data) {
            //     if (message.data === 'test') {
                    
            //     }
            // }
            // ws.send(clients.length)
            // clients[0].send("yeet")

            clients.forEach(function(client) {
                client.send(count)
            })

            // context.logger.info(aWss)
            // context.logger.info(aWss.clients)
            aWss.clients.forEach(function (client) {
                context.logger.info(client)
                client.send(count);
            });
        })
        // new NotificationWebsocketProxy(AdminMessageConfig,req.ip,context,ws,handlers);

        //this is a new connection, this must make a BRAND NEW INSTANCE!!!
      });
    //   return router
      resolve(router);
    });
};


  