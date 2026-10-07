/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Response, Request } from 'express';
import { Router } from 'express-serve-static-core';


const express = require('express');
const Promise = require('bluebird');

// Only these fully-qualified preference cookie names may be set or cleared through
// this endpoint. This prevents an authenticated caller from setting or overwriting
// arbitrary cookies on the zLUX origin (e.g. session, auth token, or CSRF cookies),
// which would enable session-fixation and cookie-bomb attacks.
const PREFERENCE_PREFIX = 'org.zowe.zlux.zlux-app-manager.preferences';
const ALLOWED_PREFERENCE_COOKIES: Set<string> = new Set([
  `${PREFERENCE_PREFIX}.language`,
  `${PREFERENCE_PREFIX}.locale`
]);
// Cap the cookie value length to further guard against oversized (cookie-bomb) values.
const MAX_PREFERENCE_VALUE_LENGTH = 256;

class BrowserPreferencesDataservice {
  private context: any;
  private router: Router;

  constructor(context: any) {
    this.context = context;
    const router = express.Router();
    router.use(function noteRequest(req: Request, res: Response, next: any): void {
      context.logger.info('ZWED0017I', req.method); /*context.logger.info('Saw request, method=' + req.method);*/
      next();
    });
    context.addBodyParseMiddleware(router);
    router.post('/', function(req: Request, res: Response): void {
      const requestBody = req.body;
      const languageFromClient = req.body ? req.body.language : null;
      const localFromClient = req.body ? req.body.locale : null;
      const savedPreferences: any = {};
      const responseBody = {
        '_objectType': 'com.rs.mvd.ng2desktop.browserPreferences',
        '_metaDataVersion': '1.0.0',
        'requestBody': req.body,
        'requestURL': req.originalUrl,
        'savedPreferences': savedPreferences
      }

      if (requestBody) {
        for (const key of Object.keys(requestBody)) {
          // Reject any cookie name that is not an explicitly allowed preference. This blocks
          // overwriting session, auth, or CSRF cookies on the zLUX origin.
          if (!ALLOWED_PREFERENCE_COOKIES.has(key)) {
            context.logger.warn('ZWED0182W', key); /*context.logger.warn('Rejected browser preference cookie, name=' + key);*/
            continue;
          }

          let value = requestBody[key];
          const expirationDate: Date = new Date();

          // If the key is there and has a value: set the cookie for 100 years (effectively permanent)
          // If the key is there but the value is null: clear the cookie by making it expire in the past
          if (value) {
            if (typeof value !== 'string' || value.length > MAX_PREFERENCE_VALUE_LENGTH) {
              context.logger.warn('ZWED0183W', key); /*context.logger.warn('Rejected browser preference value, name=' + key);*/
              continue;
            }
            expirationDate.setFullYear(expirationDate.getFullYear() + 100);
          } else {
            expirationDate.setFullYear(expirationDate.getFullYear() - 100);
            value = 'expire';
          }

          const maxAge = expirationDate.getTime();

          // httpOnly is intentionally not set: these preference cookies are read by client-side
          // JS (document.cookie). secure is derived from the request so the flag is only applied
          // over HTTPS, and sameSite=strict limits cross-site delivery.
          res.cookie(key, value, {maxAge: maxAge, secure: req.secure, sameSite: 'strict'});
          savedPreferences[key] = {
            'value': value,
            'maxAge': maxAge
          }
        }
      }

      res.status(200).json(responseBody);
    });
    this.router = router;
  }

  getRouter(): Router {
    return this.router;
  }
}


exports.browserPreferencesRouter = function(context): Router {
  return new Promise(function(resolve, reject): void {
    const dataservice = new BrowserPreferencesDataservice(context);
    resolve(dataservice.getRouter());
  });
}
