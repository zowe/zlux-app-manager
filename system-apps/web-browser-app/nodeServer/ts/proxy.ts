import { Response, Request } from "express";
import { Router } from "express-serve-static-core";
const httpProxy = require('http-proxy');
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
  private router: Router = express.Router();

  constructor(context: any) {
    this.context = context;
    const proxy = httpProxy.createProxyServer({});
    const options = this.makeProxyOptions('https://www.google.com');
    proxy.on('proxyRes', function (proxyRes, req, res) {
      context.logger.info('RAW Response from the target', JSON.stringify(proxyRes.headers, null, 2));
      proxyRes.headers['x-frame-options'] = 'allowall';
      context.logger.info('Modified Response from the target', JSON.stringify(proxyRes.headers, null, 2));
    });

    this.router.all('*', function noteRequest(req: Request, res: Response) {
      context.logger.info(`Proxy request, method=${req.method}`);
      proxy.web(req, res, options);
    });
    // context.addBodyParseMiddleware(router);
    // router.post('/', function (req: Request, res: Response) {
    //   context.logger.info(`proxy got post request`);
    //   res.status(200).json({});
    // });
  }

  private makeProxyOptions(url: string): any {
    const baseOptions: any = {
      target: 'https://www.google.ru',
      secure: false,
      changeOrigin: true,
      autoRewrite: true,
      timeout: 0,
    };
    const useSSL = url.startsWith('https://');
    return {
      ...baseOptions,
      target: url,
      secure: false,
      changeOrigin: true,
      autoRewrite: true,
      timeout: 0,
    };
  }

  getRouter(): Router {
    return this.router;
  }
}


exports.proxyRouter = function (context: any): Router {
  return new Promise(function (resolve, reject) {
    const dataService = new ProxyDataService(context);
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

