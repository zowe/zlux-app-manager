

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

var path = require('path');
var os = require('os');

var desktopDir = path.resolve(__dirname, '..');

var config = {
  'devtool': 'source-map',
  'output': {
    'libraryTarget': 'umd',
    'umdNamedDefine': true
  },
  'resolve': {
    'extensions': ['.js', '.ts'],
    'alias': {
      'pluginlib': path.resolve(desktopDir, 'src/pluginlib'),
      'zlux-base': path.resolve(__dirname, '../../zlux-platform/base/src'),
      'zlux-interface': path.resolve(__dirname, '../../zlux-platform/interface/src')
    }
  },
  'module': {
    'rules': [
      {
        /* Javascript source map loader */
        'enforce': 'pre',
        'test': /\.js$/,
        'loader': 'source-map-loader',
        'exclude': [
          /\/node_modules\//
        ]
      },
      {
        /* HTML URL resolution loader */
        'test': /\.html$/,
        'loader': 'html-loader'
      },
      {
        'test': /\.svg$/,
        'loader': 'svg-sprite-loader'
      },
      {
        /* External file loader */
        'test': /\.eot$/,
        'loader': 'file-loader?name=[name].[hash:20].[ext]'
      },
      {
        /* External (or inline) file loader */
        'test': /\.(jpg|png|gif|otf|ttf|woff|woff2|cur|ani)$/,
        'loader': 'url-loader?name=[name].[hash:20].[ext]&limit=10000'
      },
      {
        /* CSS URL loader, TODO: reconsider */
        'test': /\.css$/,
        'use': [
          'exports-loader?module.exports.toString()',
          {
            'loader': 'css-loader',
            'options': {
              'sourceMap': false
            }
          }
        ]
      },
      {
        /* TS and angular loader */
        'test': /\.ts$/,
        'loaders': [
          'ts-loader',
          'angular2-template-loader'
        ]
      }
    ]
  },
  'externals': [
    function(context, request, callback) {
      if (/(@angular)|(angular\-l10n)|(^bootstrap$)|(^popper.js$)|(^jquery$)|(^rxjs(\/operators)?$)/.test(request)){
        return callback(null, {
          commonjs: request,
          commonjs2: request,
          amd: request
        });
      }
      callback();
    }
  ]
};

module.exports = config;


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

