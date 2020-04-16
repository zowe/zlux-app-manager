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
import http from "http";
import https from "https";
import fs from 'fs';
import { CONTENT_SECURITY_POLICY, CSP } from "./csp";
const Promise = require('bluebird');

interface CheckURLResult {
  redirect: boolean;
  location?: string;
}

interface Proxy {
  proxy: httpProxy;
  target: string;
}

interface Context {
  serviceDefinition: any;
  serviceConfiguration: any;
  plugin: {
    server: {
      config: {
        user: {
          node: {
            https: {
              keys: string[];
              certificates: string[];
            }
          }
        }
      }
    }
  };
  storage: any;
  logger: {
    info: (message: string) => void;
    error: (message: string) => void;
    debug: (message: string) => void;
  };
  wsRouterPatcher: any;
  addBodyParseMiddleware: (router: Router) => void;
}

interface KeysAndCerts {
  keys: string[];
  certs: string[];
}

const X_FRAME_OPTIONS = 'x-frame-options';
const ZOWE_WEB_BROWSER_PROXY_PORT_RANGE = 'ZOWE_WEB_BROWSER_PROXY_PORT_RANGE';

const metadata = {
  _objectType: 'org.zowe.zlux.ng2desktop.webbrowser.service.proxy',
  _metaDataVersion: '1.0.0',
};

class ProxyDataService {
  private context: Context;
  private router: Router = express.Router();
  private readonly startPort: number;
  private readonly endPort: number;
  private readonly keysAndCerts: KeysAndCerts;
  private readonly portRangeDefault = { start: 8551, end: 8580 };
  private readonly proxyServerByPort = new Map<number, Proxy>();
  private portRangeSource: string = 'default';

  constructor(context: Context) {
    this.context = context;
    this.keysAndCerts = this.getServerKeyAndCert();
    const { start, end } = this.getPortRange();
    this.startPort = start;
    this.endPort = end;
    context.addBodyParseMiddleware(this.router);
    this.router.get('/', (req: Request, res: Response) => this.handleListProxyServersRequest(req, res));
    this.router.post('/', (req: Request, res: Response) => this.handleNewProxyServerRequest(req, res));
    this.router.put('/:port', (req: Request, res: Response) => this.handleReplaceProxyServerRequest(req, res));
    this.router.delete('/:port', (req: Request, res: Response) => this.handleDeleteProxyServerRequest(req, res));
    this.context.logger.info(`port range is ${this.startPort}..${this.endPort} [${this.portRangeSource}]`);
  }

  private handleListProxyServersRequest(req: Request, res: Response) {
    this.context.logger.info(`proxy got get request`);
    const instances = [];
    for (const [port, proxy] of this.proxyServerByPort) {
      instances.push({ port, target: proxy.target });
    }
    res.status(200).json({ instances, ...metadata });
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
      this.proxyServerByPort.set(port, { proxy: proxyServer, target: newURL });
      this.context.logger.info(`created proxy for ${url} (${newURL}) on port ${port}`);
      res.status(200).json({ port, ...metadata });
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

  private handleReplaceProxyServerRequest(req: Request, res: Response) {
    const port = +req.params.port;
    const url = req.body.url;
    this.context.logger.info(`proxy got put request for url=${url} port=${port}`);
    const hostname = req.hostname;
    this.checkURL(url).then((redirectResult: CheckURLResult) => {
      let newURL = url;
      if (redirectResult.redirect) {
        newURL = redirectResult.location;
      }
      const oldProxy = this.proxyServerByPort.get(port);
      if (!oldProxy) {
        res.status(404).json({ error: `proxy at port ${port} not found` });
        return;
      }
      oldProxy.proxy.close(() => {
        const proxyServer = this.startProxyServer(newURL, hostname, port);
        this.proxyServerByPort.set(port, { proxy: proxyServer, target: newURL });
        this.context.logger.info(`replaced proxy for ${url} (${newURL}) on port ${port}`);
        res.status(200).json({ port, ...metadata });
      });
    });
  }

  private handleDeleteProxyServerRequest(req: Request, res: Response) {
    const port = +req.params.port;
    this.context.logger.info(`proxy got delete request for port=${port}`);
    const proxyServer = this.proxyServerByPort.get(port);
    if (proxyServer) {
      proxyServer.proxy.close();
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
        key: this.keysAndCerts.keys,
        cert: this.keysAndCerts.certs
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
    this.context.logger.debug(`Modified Response headers from target ${JSON.stringify(proxyRes.headers, null, 2)}`);
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
    this.context.logger.debug(`check URL statusCode ${statusCode}`);
    this.context.logger.debug(`headers ${JSON.stringify(headers, null, 2)}`);
    if (statusCode === 301 || statusCode === 302) {
      resolve({ redirect: true, location: headers['location'] });
    } else {
      resolve({ redirect: false });
    }
  }

  private getServerKeyAndCert(): KeysAndCerts {
    let keys: string[] = [];
    let certs: string[] = [];
    try {
      const keyFiles = this.context.plugin.server.config.user.node.https.keys;
      const certFiles = this.context.plugin.server.config.user.node.https.certificates;
      for (const file of keyFiles) {
        keys.push(fs.readFileSync(file, 'utf-8'));
      }
      for (const file of certFiles) {
        certs.push(fs.readFileSync(file, 'utf-8'));
      }
    } catch (e) {
      this.context.logger.error(`unable to find key/cert pair(s) ${JSON.stringify(e)}`);
      certs = [];
      keys = [];
    }
    return { keys, certs };
  }

  getPortRange(): { start: number, end: number } {
    const portRangeString = process.env[ZOWE_WEB_BROWSER_PROXY_PORT_RANGE];
    if (!portRangeString) {
      this.context.logger.info(`${ZOWE_WEB_BROWSER_PROXY_PORT_RANGE} environment variable not set`);
      return this.portRangeDefault;
    }
    this.context.logger.info(`${ZOWE_WEB_BROWSER_PROXY_PORT_RANGE} environment variable: ${portRangeString}`);
    const [startString, endString] = portRangeString.split(/\.\.+/);
    const [start, end] = [+startString, +endString];
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      this.context.logger.error(`${ZOWE_WEB_BROWSER_PROXY_PORT_RANGE} is invalid. Correct format is N..M, e.g. 12345..12378`);
      return this.portRangeDefault;
    }
    if (start < 1024 || end < 1024) {
      this.context.logger.error(`${ZOWE_WEB_BROWSER_PROXY_PORT_RANGE} must not use privileged ports`);
      return this.portRangeDefault;
    }
    if (start >= end) {
      this.context.logger.error(`${ZOWE_WEB_BROWSER_PROXY_PORT_RANGE} specifies empty port range`);
      return this.portRangeDefault;
    }
    this.portRangeSource = `${ZOWE_WEB_BROWSER_PROXY_PORT_RANGE} environment variable`;
    return { start, end };
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

