const express = require('express');
const Promise = require('bluebird');
const expressWs = require('express-ws');

exports.adminNotificationWebsocketRouter = function(context) {
    /* 
      a handler is an external component for interpreting messages of types or in ways not covered in this code alone
      a handler is given the data and returns  a JSON response which includes whether to continue or not
      requires: wsmessage, this
      returns: {response: {}, continue: true/false}
      if malformed, continues.
      handlers can come from /lib for now.
    */
    let count = 0;
    let clients = [];
    let client_ids = [];
    let client_names = [];
    let instance_ids = [];

    return new Promise(function(resolve, reject) {
      let router = express.Router();  
      router.use(function abc(req,res,next) {
        context.logger.info('Saw Websocket request, method='+req.method);
        next();
      });
      router.ws('/',function(ws,req) {
        let id = req.cookies["connect.sid." + req.headers['host'].split(":")[1]]
        let symbols = Object.getOwnPropertySymbols(req.client)
        let asyncId = req.client[symbols[1]]
        
        context.logger.info(id)
        let index = client_ids.indexOf(id)
        if (index === -1) {
            client_ids.push(id)
            client_names.push(req.username)
            clients.push([ws])
            instance_ids.push([asyncId])
        } else {
            clients[index].push(ws)
            instance_ids[index].push(asyncId)
        }

        ws.on('open',()=>{
            context.logger.info("yaya")
        });

        ws.on('message', (mess)=>{
            count = count + 1;
            context.logger.info(mess)
            clients.forEach(function(client) {
                client.forEach(function(instance) {
                    instance.send(JSON.stringify({'from': req.username, 'count': count, 'notification': JSON.parse(mess)}))
                })
            })
        })

        ws.on('close', ()=> {
            let id_index = client_ids.indexOf(req.cookies["connect.sid." + req.headers['host'].split(":")[1]])
            context.logger.info("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
            let symbols_close = Object.getOwnPropertySymbols(req.client)
            context.logger.info(symbols_close)
            let asyncId_close = req.client[symbols_close[1]]
            context.logger.info(asyncId_close)
            let asyncId_index = instance_ids[id_index].indexOf(asyncId_close)
            clients[id_index].splice(asyncId_index, 1)
            instance_ids[id_index].splice(asyncId_index, 1)
        })
      });
      resolve(router);
    });
};


  