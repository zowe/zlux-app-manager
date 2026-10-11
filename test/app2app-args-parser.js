/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

const { expect } = require('chai');
const { App2AppArgsParser } = require('../virtual-desktop/src/app/start-url-manager/app2app-args-parser.service');

describe('App2AppArgsParser', function () {
  let parser;

  beforeEach(function () {
    parser = new App2AppArgsParser();
  });

  describe('parse with pluginId key', function () {
    it('should parse simple pluginId without app2app data', function () {
      const result = parser.parse(['pluginId', 'org.zowe.myplugin']);
      expect(result.pluginId).to.equal('org.zowe.myplugin');
      expect(result.actionType).to.equal('launch');
      expect(result.actionMode).to.equal('create');
      expect(result.formatter).to.equal('data');
      expect(result.contextData).to.equal('{}');
    });

    it('should parse pluginId with formatter and context data', function () {
      const result = parser.parse(['pluginId', 'org.zowe.myplugin:data:{"key":"value"}']);
      expect(result.pluginId).to.equal('org.zowe.myplugin');
      expect(result.formatter).to.equal('data');
      expect(result.contextData).to.equal('{"key":"value"}');
      expect(result.actionType).to.equal('launch');
      expect(result.actionMode).to.equal('create');
    });

    it('should set isFirstFullscreenApp true on first call', function () {
      const result = parser.parse(['pluginId', 'org.zowe.first']);
      const zlux = JSON.parse(result.contextZlux);
      expect(zlux.isFirstFullscreenApp).to.be.true;
    });

    it('should set isFirstFullscreenApp false on subsequent calls', function () {
      parser.parse(['pluginId', 'org.zowe.first']);
      const result = parser.parse(['pluginId', 'org.zowe.second']);
      const zlux = JSON.parse(result.contextZlux);
      expect(zlux.isFirstFullscreenApp).to.be.false;
    });

    it('should handle pluginId with complex context data containing colons', function () {
      const result = parser.parse(['pluginId', 'org.zowe.test:data:{"url":"http://host:8080"}']);
      expect(result.pluginId).to.equal('org.zowe.test');
      expect(result.formatter).to.equal('data');
      expect(result.contextData).to.equal('{"url":"http://host:8080"}');
    });
  });

  describe('parse with app2app key', function () {
    it('should parse full app2app format', function () {
      const result = parser.parse(['app2app', 'org.zowe.myplugin:launch:create:data:{"key":"value"}']);
      expect(result.pluginId).to.equal('org.zowe.myplugin');
      expect(result.actionType).to.equal('launch');
      expect(result.actionMode).to.equal('create');
      expect(result.formatter).to.equal('data');
      expect(result.contextData).to.equal('{"key":"value"}');
      expect(result.contextZlux).to.equal('{}');
    });

    it('should parse app2app with message action type', function () {
      const result = parser.parse(['app2app', 'org.zowe.test:message:system:data:{"msg":"hello"}']);
      expect(result.pluginId).to.equal('org.zowe.test');
      expect(result.actionType).to.equal('message');
      expect(result.actionMode).to.equal('system');
      expect(result.formatter).to.equal('data');
      expect(result.contextData).to.equal('{"msg":"hello"}');
    });

    it('should handle empty context data', function () {
      const result = parser.parse(['app2app', 'org.zowe.test:launch:create:data:']);
      expect(result.pluginId).to.equal('org.zowe.test');
      expect(result.contextData).to.equal('');
    });
  });

  describe('getPart', function () {
    it('should return empty string when no colon found', function () {
      parser.data = 'nocolon';
      parser.startIndex = 0;
      parser.length = 7;
      expect(parser.getPart()).to.equal('');
    });

    it('should extract part up to first colon', function () {
      parser.data = 'first:second:third';
      parser.startIndex = 0;
      parser.length = 18;
      expect(parser.getPart()).to.equal('first');
      expect(parser.startIndex).to.equal(6);
    });

    it('should extract subsequent parts', function () {
      parser.data = 'first:second:third';
      parser.startIndex = 0;
      parser.length = 18;
      parser.getPart(); // 'first'
      expect(parser.getPart()).to.equal('second');
      expect(parser.startIndex).to.equal(13);
    });
  });

  describe('getLastPart', function () {
    it('should return everything from startIndex to end', function () {
      parser.data = 'first:everything else here';
      parser.startIndex = 6;
      parser.length = 26;
      expect(parser.getLastPart()).to.equal('everything else here');
    });

    it('should return empty string when at end', function () {
      parser.data = 'test';
      parser.startIndex = 4;
      parser.length = 4;
      expect(parser.getLastPart()).to.equal('');
    });
  });
});

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
