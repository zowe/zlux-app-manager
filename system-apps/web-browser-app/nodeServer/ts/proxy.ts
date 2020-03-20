/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
import { Response, Request } from "express";
import { Router } from "express-serve-static-core";
import httpProxy from 'http-proxy';
import express from 'express';
import Promise from 'bluebird';
import http from "http";
import https from "https";
import fs from 'fs';
import { CONTENT_SECURITY_POLICY, CSP } from "./csp";

interface CheckURLResult {
  redirect: boolean;
  location?: string;
}

interface Context {
  serviceDefinition: any;
  serviceConfiguration: any;
  plugin: any;
  storage: any;
  logger: {
    info: (message: string) => void;
  };
  wsRouterPatcher: any;
  addBodyParseMiddleware: (router: Router) => void;
}

const X_FRAME_OPTIONS = 'x-frame-options';

class ProxyDataService {
  private context: Context;
  private router: Router = express.Router();
  private readonly startPort = 6565;
  private readonly endPort = this.startPort + 20;
  private proxyServerByPort = new Map<number, httpProxy>();

  constructor(context: Context) {
    this.context = context;
    context.addBodyParseMiddleware(this.router);
    this.router.post('/', (req: Request, res: Response) => this.handleNewProxyServerRequest(req, res));
    this.router.delete('/', (req: Request, res: Response) => this.handleDeleteProxyServerRequest(req, res));
    this.context.logger.info(`context keys are ${JSON.stringify(Object.keys(context))}`);
  }

  private handleNewProxyServerRequest(req: Request, res: Response) {
    const url = req.body.url;
    this.context.logger.info(`proxy got post request for url=${url}`);
    const hostname = req.hostname;
    this.checkURL(url).then((redirectResult: CheckURLResult) => {
      let newURL = url;
      if (redirectResult.redirect) {
        newURL = redirectResult.location;
      }
      const port = this.findFreePort();
      if (!port) {
        res.status(503).json();
        return;
      }
      const proxyServer = this.startProxyServer(newURL, hostname, port);
      this.proxyServerByPort.set(port, proxyServer);
      this.context.logger.info(`created proxy for ${url} (${newURL}) on port ${port}`);
      res.status(200).json({ port });
    });
  }

  private findFreePort(): number | undefined {
    for (let port = this.startPort; port <= this.endPort; port++) {
      if (!this.proxyServerByPort.has(port)) {
        return port;
      }
    }
    return undefined;
  }

  private handleDeleteProxyServerRequest(req: Request, res: Response) {
    const port = +req.query.port;
    this.context.logger.info(`proxy got delete request for port=${port}`);
    const proxyServer = this.proxyServerByPort.get(port);
    if (proxyServer) {
      proxyServer.close();
      this.proxyServerByPort.delete(port);
    }
    res.status(204).send();
  }

  private makeProxyOptions(url: string, hostname: string, proxyPort: number): httpProxy.ServerOptions {
    const baseOptions: httpProxy.ServerOptions = {
      target: 'dummy target',
      secure: false,
      changeOrigin: true,
      autoRewrite: true,
      followRedirects: true,
      ws: true,
      cookieDomainRewrite: `${hostname}:${proxyPort}`,
      ssl: {
        key: fs.readFileSync('../defaults/serverConfig/zlux.keystore.key', 'utf8'),
        cert: fs.readFileSync('../defaults/serverConfig/zlux.keystore.cer', 'utf8')
      },
    };
    return <httpProxy.ServerOptions>{
      ...baseOptions,
      target: url,
    };
  }

  private startProxyServer(url: string, hostname: string, port: number): httpProxy {
    this.context.logger.info(`about to create proxy for ${url}`);
    const proxyOptions = this.makeProxyOptions(url, hostname, port);
    const proxy = httpProxy.createProxyServer(proxyOptions);
    proxy.on('proxyRes', (proxyRes: http.IncomingMessage, req: http.IncomingMessage, res: http.ServerResponse) => this.handleProxyRes(proxyRes, req, res));
    proxy.on('error', (err: Error, req: http.IncomingMessage, res: http.ServerResponse) => this.handleProxyError(err, req, res));
    proxy.on('econnreset', (err: Error, req: http.IncomingMessage, res: http.ServerResponse) => this.handleProxyEconnreset(err, req, res));
    return proxy.listen(port);
  }

  private handleProxyRes(proxyRes: http.IncomingMessage, req: http.IncomingMessage, res: http.ServerResponse) {
    if (proxyRes.headers[X_FRAME_OPTIONS]) {
      proxyRes.headers[X_FRAME_OPTIONS] = 'allowall';
    }
    if (proxyRes.headers[CONTENT_SECURITY_POLICY]) {
      const cspHeaders = proxyRes.headers[CONTENT_SECURITY_POLICY];
      proxyRes.headers[CONTENT_SECURITY_POLICY] = this.fixContentSecurityPolicyHeaders(cspHeaders);
    }
    this.context.logger.info(`Modified Response headers from target ${JSON.stringify(proxyRes.headers, null, 2)}`);
  }
  
  private fixContentSecurityPolicyHeaders(cspHeaders: string | string[]): string | string[] {
    if (Array.isArray(cspHeaders)) {
      return cspHeaders.map(header => this.fixContentSecurityPolicyHeader(header));
    }
    return this.fixContentSecurityPolicyHeader(cspHeaders);
  }
  
  private fixContentSecurityPolicyHeader(header: string): string {
    const csp = CSP.parse(header);
    const directivesToRemove = [
      'child-src',
      'default-src',
      'frame-src',
      'frame-ancestors',
    ];
    directivesToRemove.forEach(directive => delete csp[directive])
    return CSP.stringify(csp);
  }

  private handleProxyError(err: Error, req: http.IncomingMessage, res: http.ServerResponse) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Something went wrong: ${JSON.stringify(err, null, 2)}`);
  }

  private handleProxyEconnreset(err: Error, req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Connection reset: ${JSON.stringify(err, null, 2)}`);
  }

  private checkURL(url: string) {
    return new Promise((resolve, reject) => {
      const isTLS = url.startsWith('https://');
      if (isTLS) {
        https.get(url, (res: http.IncomingMessage) => this.processCheckRequest(resolve, reject, res));
      } else {
        http.get(url, (res: http.IncomingMessage) => this.processCheckRequest(resolve, reject, res));
      }
    });
  }

  private processCheckRequest(resolve, reject, res: http.IncomingMessage) {
    const { statusCode, headers } = res;
    console.log(`statusCode ${statusCode}`);
    console.log(`headers ${JSON.stringify(headers, null, 2)}`);
    if (statusCode === 301) {
      resolve({ redirect: true, location: headers['location'] });
    } else {
      resolve({ redirect: false });
    }
  }

  getRouter(): Router {
    return this.router;
  }
}

exports.proxyRouter = function (context: Context) {
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

