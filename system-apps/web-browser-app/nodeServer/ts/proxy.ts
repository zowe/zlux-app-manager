import { Response, Request } from "express";
import { Router } from "express-serve-static-core";

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

const express = require('express');
const Promise = require('bluebird');

class ProxyDataService {
  private context: any;
  private router: Router;

  constructor(context: any) {
    this.context = context;
    let router = express.Router();
    router.use(function noteRequest(req: Request, res: Response, next: any) {
      context.logger.info(`Proxy request, method=${req.method}`);
      next();
    });
    context.addBodyParseMiddleware(router);
    router.post('/', function (req: Request, res: Response) {
      context.logger.info(`proxy got post request`);
      res.status(200).json({});
    });
    this.router = router;
  }

  getRouter(): Router {
    return this.router;
  }
}


exports.proxyRouter = function (context: any): Router {
  return new Promise(function (resolve, reject) {
    let dataService = new ProxyDataService(context);
    resolve(dataService.getRouter());
  });
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

