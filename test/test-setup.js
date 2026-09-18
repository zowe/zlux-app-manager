/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

// Register mock modules before any test files load
const Module = require('module');
const path = require('path');

const angularCoreMock = require('./mocks/angular-core');
require.cache[require.resolve('./mocks/angular-core')] = require.cache[require.resolve('./mocks/angular-core')];

// Intercept requires for @angular/core
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === '@angular/core') {
    return require.resolve('./mocks/angular-core');
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Minimal global stubs for browser/Angular environment
global.window = {
  location: { pathname: '/ZLUX/plugins/' }
};

global.navigator = {
  language: 'en-US',
  userAgent: 'test-agent'
};

global.document = {
  cookie: ''
};
