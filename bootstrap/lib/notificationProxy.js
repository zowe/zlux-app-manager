

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

const express = require('express');
const Promise = require('bluebird');

exports.adminNotificationWebsocketRouter = function(context) {
    let clients = [];
    let client_ids = [];
    let client_names = [];
    let instance_ids = [];
    const EVERYONE = "Everyone"
    const INDIVIDUAL = "Individual"


    return new Promise(function(resolve, reject) {
      let router = express.Router();
      if (!router.ws) {
        context.wsRouterPatcher(router);
      }

      router.use(function abc(req,res,next) {
        context.logger.info('Saw Websocket request, method='+req.method);
        next();
      });
      context.addBodyParseMiddleware(router);
      router.post('/write', function(req, res) {
        if (context.plugin.server.config.user.dataserviceAuthentication.rbac) {
            if (req.body.recipient === INDIVIDUAL) {
                let index = client_names.indexOf(req.body.username.toUpperCase())
                if (index != -1) {
                    clients[index].forEach(function(instance) {
                        instance.send(JSON.stringify({'from': req.username, 'notification': req.body.notification, "to": req.body.recipient}))
                    })
                    res.status(201).json({"Response" : "Message sent to " + req.body.recipient});
                } else {
                    if (req.body.username === "") {
                        res.status(404).json({"Response" : "Recipient input cannot be blank"});
                    } else {
                        res.status(404).json({"Response" : req.body.username + " is not a valid user or is not online"});
                    }
                }
            } else if (req.body.recipient === EVERYONE){
                clients.forEach(function(client) {
                    client.forEach(function(instance) {
                        instance.send(JSON.stringify({'from': req.username, 'notification': req.body.notification, "to": req.body.recipient}))
                    })
                })
                res.status(201).json({"Response" : "Message sent to Everyone"});
            } else {
                res.status(400).json({"Response": "Message was not sent"})
            }
        } else {
            res.status(403).json({"Response": "RBAC is not enabled"})
        }
      });
      router.ws('/',function(ws,req) {
        let id = req.cookies["connect.sid." + req.headers['host'].split(":")[1]]
        let symbols = Object.getOwnPropertySymbols(req.client)
        let asyncId = req.client[symbols[1]]

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

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
