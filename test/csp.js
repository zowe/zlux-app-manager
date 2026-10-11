/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

const { expect } = require('chai');
const { CSP, CONTENT_SECURITY_POLICY } = require('../system-apps/web-browser-app/nodeServer/ts/csp');

describe('CSP (Content Security Policy)', function () {
  describe('CONTENT_SECURITY_POLICY constant', function () {
    it('should equal content-security-policy', function () {
      expect(CONTENT_SECURITY_POLICY).to.equal('content-security-policy');
    });
  });

  describe('parse', function () {
    it('should parse a single directive', function () {
      const result = CSP.parse("default-src 'self'");
      expect(result['default-src']).to.equal("'self'");
    });

    it('should parse multiple directives', function () {
      const result = CSP.parse("default-src 'self'; script-src 'unsafe-inline'; style-src https:");
      expect(result['default-src']).to.equal("'self'");
      expect(result['script-src']).to.equal("'unsafe-inline'");
      expect(result['style-src']).to.equal("https:");
    });

    it('should handle directives with multiple values', function () {
      const result = CSP.parse("script-src 'self' https://cdn.example.com 'unsafe-eval'");
      expect(result['script-src']).to.equal("'self' https://cdn.example.com 'unsafe-eval'");
    });

    it('should normalize to lowercase', function () {
      const result = CSP.parse("Default-Src 'SELF'");
      expect(result['default-src']).to.equal("'self'");
    });

    it('should handle empty string', function () {
      const result = CSP.parse("");
      expect(result).to.be.an('object');
    });

    it('should handle whitespace around directives', function () {
      const result = CSP.parse("  default-src 'self'  ;  script-src 'none'  ");
      expect(result['default-src']).to.equal("'self'");
      expect(result['script-src']).to.equal("'none'");
    });

    it('should handle directive without values', function () {
      const result = CSP.parse("upgrade-insecure-requests;");
      expect(result).to.have.property('upgrade-insecure-requests');
    });

    it('should handle complex real-world CSP', function () {
      const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; img-src * data:; frame-ancestors 'none'";
      const result = CSP.parse(csp);
      expect(result['default-src']).to.equal("'self'");
      expect(result['script-src']).to.include('unsafe-inline');
      expect(result['img-src']).to.include('data:');
      expect(result['frame-ancestors']).to.equal("'none'");
    });
  });

  describe('stringify', function () {
    it('should convert CSP object back to string', function () {
      const csp = { 'default-src': "'self'", 'script-src': "'none'" };
      const result = CSP.stringify(csp);
      expect(result).to.include("default-src 'self'");
      expect(result).to.include("script-src 'none'");
      expect(result).to.include(';');
    });

    it('should handle single directive', function () {
      const csp = { 'default-src': "'self'" };
      const result = CSP.stringify(csp);
      expect(result).to.equal("default-src 'self'");
    });

    it('should handle empty object', function () {
      const result = CSP.stringify({});
      expect(result).to.equal('');
    });

    it('should roundtrip parse and stringify', function () {
      const original = "default-src 'self';script-src 'unsafe-inline'";
      const parsed = CSP.parse(original);
      const stringified = CSP.stringify(parsed);
      const reparsed = CSP.parse(stringified);
      expect(reparsed['default-src']).to.equal(parsed['default-src']);
      expect(reparsed['script-src']).to.equal(parsed['script-src']);
    });
  });
});
