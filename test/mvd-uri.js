/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

const { expect } = require('chai');

/**
 * Tests for URI broker utility methods from bootstrap/src/uri/mvd-uri.ts.
 * Logic extracted to test independently of browser/Angular dependencies.
 */

function createParamURL(parameters) {
  let parametersFiltered = parameters.filter(String);
  let paramUrl = '';
  if (parametersFiltered.length === 0) {
    return paramUrl;
  } else {
    paramUrl = '?';
    for (let param of parametersFiltered) {
      paramUrl = paramUrl + param + '&';
    }
    paramUrl = paramUrl.substring(0, paramUrl.length - 1);
  }
  return paramUrl;
}

function serverRootUri(uri_prefix, uri) {
  return `${uri_prefix}${uri}`;
}

function pluginRootUri(uri_prefix, identifier) {
  return serverRootUri(uri_prefix, `ZLUX/plugins/${identifier}/`);
}

function pluginResourceUri(uri_prefix, identifier, relativePath) {
  if (relativePath == null) {
    relativePath = "";
  }
  return `${pluginRootUri(uri_prefix, identifier)}web/${relativePath}`;
}

function pluginRESTUri(uri_prefix, identifier, serviceName, relativePath, version) {
  version = version || "_current";
  if (relativePath == null) {
    relativePath = "";
  }
  return `${pluginRootUri(uri_prefix, identifier)}services/${serviceName}/${version}/${relativePath}`;
}

function pluginConfigForScopeUri(uri_prefix, identifier, scope, resourcePath, resourceName) {
  let name = resourceName ? '?name=' + resourceName : '';
  return serverRootUri(uri_prefix, `ZLUX/plugins/org.zowe.configjs/services/data/_current/${identifier}/${scope}/${resourcePath}${name}`);
}

function datasetContentsUri(agentPrefix, dsn) {
  return `${agentPrefix}datasetContents/${encodeURIComponent(dsn).replace(/\%2F/gi, '/')}`;
}

function unixFileUri(agentPrefix, route, absPath, options) {
  options = options || {};
  if (!options.responseType) {
    options.responseType = 'raw';
  }
  let paramArray = [];
  Object.entries(options).forEach(function ([key, value]) {
    if (value !== undefined) {
      paramArray.push(`${key}=${value}`);
    }
  });
  let params = createParamURL(paramArray);
  let absPathParam = encodeURIComponent(absPath).replace(/\%2F/gi, '/');
  return `${agentPrefix}unixfile/${route}/${absPathParam}${params}`.replace(/(\/+)/g, '/');
}

describe('MvdUri - createParamURL', function () {
  it('should return empty string for empty array', function () {
    expect(createParamURL([])).to.equal('');
  });

  it('should return empty string when all elements are empty strings', function () {
    expect(createParamURL(['', '', ''])).to.equal('');
  });

  it('should create URL with single parameter', function () {
    expect(createParamURL(['key=value'])).to.equal('?key=value');
  });

  it('should create URL with multiple parameters', function () {
    expect(createParamURL(['a=1', 'b=2', 'c=3'])).to.equal('?a=1&b=2&c=3');
  });

  it('should filter out empty strings from parameters', function () {
    expect(createParamURL(['a=1', '', 'c=3'])).to.equal('?a=1&c=3');
  });

  it('should handle single non-empty among empties', function () {
    expect(createParamURL(['', 'key=val', ''])).to.equal('?key=val');
  });
});

describe('MvdUri - serverRootUri', function () {
  it('should combine prefix with uri', function () {
    expect(serverRootUri('/', 'test')).to.equal('/test');
  });

  it('should handle proxy prefix', function () {
    expect(serverRootUri('/api/v1/zlux/', 'plugins?type=all')).to.equal('/api/v1/zlux/plugins?type=all');
  });
});

describe('MvdUri - pluginRootUri', function () {
  it('should build plugin root path', function () {
    expect(pluginRootUri('/', 'org.zowe.test')).to.equal('/ZLUX/plugins/org.zowe.test/');
  });

  it('should build plugin root with proxy prefix', function () {
    expect(pluginRootUri('/api/v1/zlux/', 'org.zowe.test')).to.equal('/api/v1/zlux/ZLUX/plugins/org.zowe.test/');
  });
});

describe('MvdUri - pluginResourceUri', function () {
  it('should build web resource path', function () {
    expect(pluginResourceUri('/', 'org.zowe.test', 'assets/file.js')).to.equal('/ZLUX/plugins/org.zowe.test/web/assets/file.js');
  });

  it('should handle null relativePath', function () {
    expect(pluginResourceUri('/', 'org.zowe.test', null)).to.equal('/ZLUX/plugins/org.zowe.test/web/');
  });

  it('should handle empty relativePath', function () {
    expect(pluginResourceUri('/', 'org.zowe.test', '')).to.equal('/ZLUX/plugins/org.zowe.test/web/');
  });
});

describe('MvdUri - pluginRESTUri', function () {
  it('should build REST URI with default version', function () {
    expect(pluginRESTUri('/', 'org.zowe.test', 'data', 'path')).to.equal('/ZLUX/plugins/org.zowe.test/services/data/_current/path');
  });

  it('should build REST URI with explicit version', function () {
    expect(pluginRESTUri('/', 'org.zowe.test', 'data', 'path', 'v2')).to.equal('/ZLUX/plugins/org.zowe.test/services/data/v2/path');
  });

  it('should handle null relativePath', function () {
    expect(pluginRESTUri('/', 'org.zowe.test', 'svc', null)).to.equal('/ZLUX/plugins/org.zowe.test/services/svc/_current/');
  });
});

describe('MvdUri - pluginConfigForScopeUri', function () {
  it('should build config URI for user scope', function () {
    const result = pluginConfigForScopeUri('/', 'org.zowe.test', 'user', 'settings');
    expect(result).to.equal('/ZLUX/plugins/org.zowe.configjs/services/data/_current/org.zowe.test/user/settings');
  });

  it('should include resource name as query param', function () {
    const result = pluginConfigForScopeUri('/', 'org.zowe.test', 'site', 'config', 'myResource');
    expect(result).to.equal('/ZLUX/plugins/org.zowe.configjs/services/data/_current/org.zowe.test/site/config?name=myResource');
  });

  it('should not include name param when undefined', function () {
    const result = pluginConfigForScopeUri('/', 'org.zowe.test', 'instance', 'data');
    expect(result).to.not.include('?name=');
  });
});

describe('MvdUri - datasetContentsUri', function () {
  it('should encode dataset name', function () {
    const result = datasetContentsUri('/agent/', 'MY.DATASET');
    expect(result).to.equal('/agent/datasetContents/MY.DATASET');
  });

  it('should handle special characters in dataset name', function () {
    const result = datasetContentsUri('/agent/', 'HLQ.TEST(MEMBER)');
    expect(result).to.include('datasetContents/');
    expect(result).to.include('HLQ.TEST');
  });
});

describe('MvdUri - unixFileUri', function () {
  it('should build unix file URI with default responseType', function () {
    const result = unixFileUri('/agent/', 'contents', '/u/user/file.txt', {});
    expect(result).to.include('unixfile/contents');
    expect(result).to.include('/u/user/file.txt');
    expect(result).to.include('responseType=raw');
  });

  it('should include optional parameters', function () {
    const result = unixFileUri('/agent/', 'contents', '/u/test', { sourceEncoding: 'UTF-8', targetEncoding: 'IBM-1047' });
    expect(result).to.include('sourceEncoding=UTF-8');
    expect(result).to.include('targetEncoding=IBM-1047');
    expect(result).to.include('responseType=raw');
  });

  it('should not include undefined values in params', function () {
    const result = unixFileUri('/agent/', 'contents', '/u/test', { sourceEncoding: undefined, mode: '755' });
    expect(result).to.not.include('sourceEncoding');
    expect(result).to.include('mode=755');
  });

  it('should preserve slashes in path', function () {
    const result = unixFileUri('/agent/', 'contents', '/u/user/dir/file', {});
    expect(result).to.include('/u/user/dir/file');
  });
});

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
