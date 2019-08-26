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
    let client_ids = [];
    let instance_ids = [];

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
        // context.logger.info(req)
        // context.logger.info(req.headers)
        // context.logger.info(req.headers['host'])
        // context.logger.info(req.headers['host'].split(":"))
        // context.logger.info(req.headers['host'].split(":")[1])
        // context.logger.info("connect.sid." + req.headers['host'].split(":")[1])
        // context.logger.info(req.cookies["connect.sid." + req.headers['host'].split(":")[1]])
        // context.logger.info(req.cookies)
        let id = req.cookies["connect.sid." + req.headers['host'].split(":")[1]]
        // let symbols = Object.getOwnPropertySymbols(req.socket['_tlsOptions']['server'])
        // let asyncId = req.socket['_tlsOptions']['server'][symbols[symbols.length - 1]]
        // let ssl_symbols = Object.getOwnPropertySymbols(req.client.ssl['_parent'])
        // let inner_ssl_symbols = Object.getOwnPropertySymbols(req.client.ssl['_parent'][ssl_symbols[0]])
        // let asyncId = req.client.ssl['_parent'][ssl_symbols[0]][inner_ssl_symbols[0]]
        let symbols = Object.getOwnPropertySymbols(req.client)
        let asyncId = req.client[symbols[1]]
        
        context.logger.info(id)
        let index = client_ids.indexOf(id)
        if (index === -1) {
            client_ids.push(id)
            clients.push([ws])
            instance_ids.push([asyncId])
        } else {
            context.logger.info(clients)
            context.logger.info(client_ids)
            context.logger.info(instance_ids)
            clients[index].push(ws)
            instance_ids[index].push(asyncId)
        }

        // const myHost = window.location.host;
        // const protocol = window.location.protocol;
        // context.logger.info(myHost)
        // context.logger.info(protocol)
        // context.logger.info(req.clients)

        // context.logger.info("yayayaya")
        // clients.push(ws)

        ws.on('open',()=>{
            // ws.send("hey")
            // aWss.clients.forEach(function (client) {
            //     client.send(count);
            // });
            context.logger.info("yaya")
        });

        ws.on('message', (mess)=>{
            count = count + 1;
            context.logger.info(JSON.parse(mess))
            // let id = req.cookies["connect.sid." + req.headers['host'].split(":")[1]]
            // context.logger.info(id)
            // context.logger.info(client_ids.length)
            // context.logger.info(req.socket['_tlsOptions'])
            // context.logger.info(Object.getOwnPropertySymbols(req.socket['_tlsOptions']['server']))
            // Object.getOwnPropertySymbols(req.socket['_tlsOptions']['server']).forEach(function(yeet) {
            //     context.logger.info(yeet)
            //     context.logger.info(req.socket['_tlsOptions']['server'][yeet])
            // })
            // let symbols = Object.getOwnPropertySymbols(req.socket['_tlsOptions']['server'])
            // context.logger.info(symbols)
            // context.logger.info(symbols.length)
            // context.logger.info(req.socket['_tlsOptions']['server'][symbols[symbols.length - 1]])
            // let ssl_symbols = Object.getOwnPropertySymbols(req.client.ssl['_parent'])
            // let inner_ssl_symbols = Object.getOwnPropertySymbols(req.client.ssl['_parent'][ssl_symbols[0]])
            let symbols = Object.getOwnPropertySymbols(req.client)
            context.logger.info(req.client[symbols[1]])
            // let ssl_symbols = Object.getOwnPropertySymbols(req.socket)
            // context.logger.info(req.socket['_tlsOptions']['ssl'][symbols[symbols.length - 1]])

            // context.logger.info(req.socket['_tlsOptions']['server'].requestCert)
            // context.logger.info(req)
            // context.logger.info(instance_ids)
            // context.logger.info(client_ids)
            // context.logger.info(req.cookies)
            // if (message.data) {
            //     if (message.data === 'test') {
                    
            //     }
            // }
            // ws.send(clients.length)
            // clients[0].send("yeet")
            // context.logger.info(clients)
            clients.forEach(function(client) {
                client.forEach(function(instance) {
                    instance.send(JSON.stringify({'count': count, 'message': JSON.parse(mess)['message']}))
                })
            })

            // context.logger.info(aWss)
            // context.logger.info(aWss.clients)
            // aWss.clients.forEach(function (client) {
            //     context.logger.info(client)
            //     client.send(count);
            // });
        })

        ws.on('close', ()=> {
            let id_index = client_ids.indexOf(req.cookies["connect.sid." + req.headers['host'].split(":")[1]])
            // let symbols_close = Object.getOwnPropertySymbols(req.socket['_tlsOptions']['server'])
            // let asyncId_index = instance_ids[id_index].indexOf(req.socket['_tlsOptions']['server'][symbols_close[symbols_close.length - 1]])
            // client_ids.splice(index, 1)
            // clients.splice(index, 1)
            context.logger.info("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
            let symbols_close = Object.getOwnPropertySymbols(req.client)
            context.logger.info(symbols_close)
            let asyncId_close = req.client[symbols_close[1]]
            context.logger.info(asyncId_close)
            let asyncId_index = instance_ids[id_index].indexOf(asyncId_close)
            // let ssl_symbols_close = Object.getOwnPropertySymbols(req.client.ssl['_parent'])
            // let inner_ssl_symbols_close = Object.getOwnPropertySymbols(req.client.ssl['_parent'][ssl_symbols_close[0]])
            // let asyncId_close = req.client.ssl['_parent'][ssl_symbols_close[0]][inner_ssl_symbols_close[0]]
            // context.logger.info(clients)
            // context.logger.info(instance_ids)
            clients[id_index].splice(asyncId_index, 1)
            instance_ids[id_index].splice(asyncId_index, 1)
            // context.logger.info(clients)
            // context.logger.info(instance_ids)
            // context.logger.info("yeetyeetyeet")
            // context.logger.info(id_index)
            // context.logger.info(symbols_close)
            // context.logger.info(asyncId_close)
        })
        // new NotificationWebsocketProxy(AdminMessageConfig,req.ip,context,ws,handlers);

        //this is a new connection, this must make a BRAND NEW INSTANCE!!!
      });
    //   return router
      resolve(router);
    });
};


  