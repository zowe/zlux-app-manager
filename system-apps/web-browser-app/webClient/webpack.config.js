

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

var path = require('path');
var webpackConfig = require('webpack-config');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var { AngularCompilerPlugin } = require('@ngtools/webpack');

if (process.env.MVD_DESKTOP_DIR == null) {
  throw new Error('You must specify MVD_DESKTOP_DIR in your environment');
}

var config = {
  mode: 'development',
  'entry': [
    path.resolve(__dirname, './src/plugin.ts')
  ],
  'output': {
    'path': path.resolve(__dirname, '../web'),
    'filename': 'main.js',
  },
  'module': {
    'rules': [
      {
        'test': /\.scss$/,
        'use': [
          { 'loader': 'to-string-loader'},
          { 'loader': 'css-loader' },
          { 'loader': 'sass-loader' }
        ],
      },
    ]
  },
  'plugins': [
    new AngularCompilerPlugin({
      tsConfigPath: path.resolve(__dirname, './tsconfig.json'),
      mainPath: path.resolve(__dirname, './src/plugin.ts'),
      sourceMap: true,
      skipCodeGeneration: true,
      platform: 0
    }),
    new CopyWebpackPlugin([
      {
        from: path.resolve(__dirname, './src/assets'),
        to: path.resolve('../web/assets')
      }
    ])
  ]
};

module.exports = new webpackConfig.Config()
  .extend(path.resolve(process.env.MVD_DESKTOP_DIR, 'plugin-config/webpack.base..ng.js'))
  .merge(config);


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

