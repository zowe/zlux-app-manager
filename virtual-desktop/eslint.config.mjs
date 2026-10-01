// @ts-check

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';

export default tseslint.config(
  {
    ignores: [
      'web/**',
      'lib/**',
      'nodeServer/**',
      'node_modules/**',
      'plugin-config/**',
      'gzip.mjs',
    ],
  },

  // TypeScript sources
  {
    files: ['src/**/*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      '@angular-eslint': angular,
    },
    processor: angularTemplate.processors['extract-inline-html'],
    rules: {
      ...angular.configs.recommended.rules,

      // Component/directive selector prefixes. The desktop predates the "app"
      // prefix recorded in angular.json and ships rs-com-*, com-rs-* and zowe-*
      // selectors, with a handful carrying no prefix at all. Warn rather than
      // error so new code is nudged toward a prefix without flagging the
      // existing surface, which cannot be renamed without breaking plugins.
      '@angular-eslint/component-selector': [
        'warn',
        { type: 'element', prefix: ['rs-com', 'com-rs', 'zowe', 'app'], style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'warn',
        { type: 'attribute', prefix: ['rsCom', 'comRs', 'zowe', 'app'], style: 'camelCase' },
      ],

      // --- Live gate -------------------------------------------------------
      // These currently have zero violations, so they are hard errors and will
      // block any new occurrence.
      'no-eval': 'error',
      'no-caller': 'error',
      'no-debugger': 'error',
      'no-throw-literal': 'error',
      'no-new-wrappers': 'error',
      'no-duplicate-case': 'error',

      // --- Existing backlog ------------------------------------------------
      // Each of these is violated by the code as it stands today. They are
      // warnings so that `npm run lint` is usable now and introduces no source
      // churn; the `--max-warnings` ceiling in the lint script keeps the count
      // from growing. Promote each to 'error' as its backlog reaches zero.
      'prefer-const': 'warn',
      'eqeqeq': ['warn', 'allow-null'],
      'curly': 'warn',
      'no-var': 'warn',
      'no-bitwise': 'warn',
      'radix': 'warn',
      'no-fallthrough': 'warn',
      'no-case-declarations': 'warn',
      'no-cond-assign': 'warn',
      'no-control-regex': 'warn',
      'no-useless-escape': 'warn',
      'no-prototype-builtins': 'warn',
      'no-constant-binary-expression': 'warn',
      'no-console': ['warn', { allow: ['log', 'warn', 'error'] }],

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',

      '@angular-eslint/no-input-rename': 'warn',
      '@angular-eslint/contextual-lifecycle': 'warn',
      '@angular-eslint/no-empty-lifecycle-method': 'warn',
      '@angular-eslint/use-lifecycle-interface': 'warn',
    },
  },

  // Angular templates
  {
    files: ['src/**/*.html'],
    plugins: {
      '@angular-eslint/template': angularTemplate,
    },
    languageOptions: {
      parser: angularTemplateParser,
    },
    rules: {
      ...angularTemplate.configs.recommended.rules,
      // Existing backlog; see the note on the TypeScript block above.
      '@angular-eslint/template/eqeqeq': 'warn',
    },
  },
);
