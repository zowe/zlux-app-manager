/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

const express = require('express');
const Promise = require('bluebird');
const fs = require('fs');
import { Response, Request } from "express";
import { Router } from "express-serve-static-core";


class PluginDetailDataservice {
  private context: any;
  private pluginDefs: any;
  private router: Router;
  
  constructor(context: any) {
    this.context = context;
    let router = express.Router();

    router.use(function noteRequest(req: Request, res: Response, next: any) {
      context.logger.info('Saw request, method=' + req.method);
      next();
    });

    context.addBodyParseMiddleware(router);

    // Return all plugins
    router.get('/',function(req: Request,res: Response) {
      const pluginDefs = context.plugin.server.state.pluginMap;
      res.status(200).json({"allPlugins": pluginDefs});
    });

    // Returns a JSON of all doc file names found
    router.get('/docs/:identifier', function(req: Request, res: Response) {
      const relativePath: string = '/doc';
      const pluginDefs: any = context.plugin.server.state.pluginMap;
      const identifier: string = req.params.identifier;
      const plugin: any = pluginDefs[identifier];
      let location = plugin.location + relativePath;
      let docNames = [];
      let serializedNamePath = [];        
      try {
        docNames = fs.readdirSync(location);
      } catch (err) {
        console.log('Unable to scan directory: ' + err);
      }
      for (let doc of docNames) {
        serializedNamePath.push([doc, relativePath]);
      }
      res.status(200).json({"plugin": identifier, "doc": serializedNamePath});
    });

    // Returns the file contents of the specific doc requested
    router.post('/:identifier', function(req: Request, res: Response) {
      let pluginDefs: any = context.plugin.server.state.pluginMap;
      let identifier: string = req.params.identifier;
      let path: string = req.body.docLocation;
      let plugin: any = pluginDefs[identifier];
      let location: string = plugin.location + path;

      // search for a plugin doc and return it
      res.status(200).sendFile(location, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log('Sent')
        }
      })
    });

    this.router = router;
  }

  getRouter():Router{
    return this.router;
  }
}


exports.pluginDetailRouter = function(context): Router {
  return new Promise(function(resolve, reject) {
    let dataservice = new PluginDetailDataservice(context);
    resolve(dataservice.getRouter());
  });
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

