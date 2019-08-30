const express = require('express');
const Promise = require('bluebird');
const expressWs = require('express-ws');

exports.adminNotificationWebsocketRouter = function(context) {
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
      context.addBodyParseMiddleware(router);
      router.post('/write', function(req, res) {
        context.logger.info(req.body)
        context.logger.info(req.body.username)
        if (req.body.recipient == "individual") {
            context.logger.info("hey")
            let index = client_names.indexOf(req.body.username.toUpperCase())
            if (index != -1) {
                clients[index].forEach(function(instance) {
                    instance.send(JSON.stringify({'from': req.username, 'notification': req.body.notification, "to": req.body.recipient}))
                })
                res.status(201).json({"Response" : "Message sent to " + req.body.recipient});
            } else {
                context.logger.info("throw error")
                res.status(404).json({"Response" : req.body.username + " is not a valid user or is not online"});
            }
        } else if (req.body.recipient == "everyone"){
            context.logger.info("hoe")
            clients.forEach(function(client) {
                client.forEach(function(instance) {
                    instance.send(JSON.stringify({'from': req.username, 'notification': req.body.notification, "to": req.body.recipient}))
                })
            })
            res.status(201).json({"Response" : "Message sent to Everyone"});
        } else {
            res.status(400).json({"Response": "Message was not sent"})
        }
      });
      router.ws('/',function(ws,req) {
        let id = req.cookies["connect.sid." + req.headers['host'].split(":")[1]]
        let symbols = Object.getOwnPropertySymbols(req.client)
        let asyncId = req.client[symbols[1]]

        context.logger.info(id)
        let index = client_ids.indexOf(id)
        if (index === -1) {
            client_ids.push(id)
            client_names.push(req.username.toUpperCase())
            clients.push([ws])
            instance_ids.push([asyncId])
        } else {
            clients[index].push(ws)
            instance_ids[index].push(asyncId)
        }

        ws.on('open',()=>{
            context.logger.info("ah")
        });

        // ws.on('message', (mess)=>{
        //     count = count + 1;
        //     clients.forEach(function(client) {
        //         client.forEach(function(instance) {
        //             instance.send(JSON.stringify({'from': req.username, 'count': count, 'notification': JSON.parse(mess)}))
        //         })
        //     })
        // })

        ws.on('close', ()=> {
            let id_index = client_ids.indexOf(req.cookies["connect.sid." + req.headers['host'].split(":")[1]])
            let symbols_close = Object.getOwnPropertySymbols(req.client)
            let asyncId_close = req.client[symbols_close[1]]
            let asyncId_index = instance_ids[id_index].indexOf(asyncId_close)
            clients[id_index].splice(asyncId_index, 1)
            instance_ids[id_index].splice(asyncId_index, 1)
        })
      });
      resolve(router);
    });
};