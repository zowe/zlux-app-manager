/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

const { expect } = require('chai');
const { SimpleGlobalization } = require('../bootstrap/src/i18n/simple-globalization');

describe('SimpleGlobalization', function () {
  let glob;

  beforeEach(function () {
    glob = new SimpleGlobalization();
  });

  describe('getLanguage', function () {
    it('should return language part of navigator.language', function () {
      global.navigator = { language: 'en-US' };
      expect(glob.getLanguage()).to.equal('en');
    });

    it('should handle language without locale', function () {
      global.navigator = { language: 'fr' };
      expect(glob.getLanguage()).to.equal('fr');
    });

    it('should handle complex locale codes', function () {
      global.navigator = { language: 'zh-Hans-CN' };
      expect(glob.getLanguage()).to.equal('zh');
    });
  });

  describe('getLocale', function () {
    it('should return locale part when available', function () {
      global.navigator = { language: 'en-US' };
      expect(glob.getLocale()).to.equal('US');
    });

    it('should return US when no locale part', function () {
      global.navigator = { language: 'en' };
      expect(glob.getLocale()).to.equal('US');
    });

    it('should handle different locales', function () {
      global.navigator = { language: 'fr-FR' };
      expect(glob.getLocale()).to.equal('FR');
    });

    it('should return second part for complex codes', function () {
      global.navigator = { language: 'zh-Hans' };
      expect(glob.getLocale()).to.equal('Hans');
    });
  });

  describe('setLanguage', function () {
    it('should return the language passed in', function () {
      expect(glob.setLanguage('de')).to.equal('de');
    });
  });

  describe('setLocale', function () {
    it('should return the locale passed in', function () {
      expect(glob.setLocale('GB')).to.equal('GB');
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
