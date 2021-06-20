/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

var path = require('path');
const fs = require('fs');
var webpackConfig = require('webpack-config');
var CopyWebpackPlugin = require('copy-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const APP_DIR = path.resolve(__dirname, './src');
const MONACO_DIR = path.resolve(__dirname, './node_modules/monaco-editor');
const pluginId = JSON.parse(fs.readFileSync('../pluginDefinition.json')).identifier.replace(/\./g, '_');


if (process.env.MVD_DESKTOP_DIR == null) {
  throw new Error('You must specify MVD_DESKTOP_DIR in your environment');
}

const pubPath = "../../org.zowe.zlux.desktop.documentation.viewer/web/";
process.env.ASSET_PATH=pubPath;

try {
  var config = {
    'entry': [
      path.resolve(__dirname, './src/index.tsx')
    ],
    'output': {
      'path': path.resolve(__dirname, '../web'),
      'filename': 'main.js',
      publicPath: pubPath
    },
    'plugins': [
      new CopyWebpackPlugin([
        {
          from: path.resolve(__dirname, './src/assets'),
          to: path.resolve('../web/assets')
        }
      ]),
      new MonacoWebpackPlugin({publicPath: pubPath})
    ]
  };

  let basePath = path.resolve(process.env.MVD_DESKTOP_DIR, 'plugin-config/webpack.react.base.js');
  let baseConfig = new webpackConfig.Config().extend(basePath);
  let rules = baseConfig.module.rules;
  for (let i = 0; i < rules.length; i++) {
    if (rules[i].test && rules[i].test.source == '\\.css$') {
      rules.splice(i,1);
      break;
    }
  }
  rules.push({
    test: /\.css$/,
    include: APP_DIR,
    'use': [
      { 'loader': 'style-loader' },
      {
        'loader': 'css-loader',
        'options': {
          sourceMap: false,
          modules: true,
          localIdentName: pluginId+'__[local]'
        }
      }
    ]
  }, {
    test: /\.css$/,
    include: MONACO_DIR,
    'use': ['style-loader', 'css-loader'],
  });
  baseConfig.merge(config);
  module.exports = baseConfig;
} catch (e) {
  fs.copyFileSync('tsconfig.json.tmp', 'tsconfig.json');
  fs.copyFileSync('tslint.json.tmp', 'tslint.json');
  throw e;
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
