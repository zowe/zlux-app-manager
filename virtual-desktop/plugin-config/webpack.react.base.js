

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

var webpack = require('webpack');
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
    'extensions': ['.js', '.ts', '.jsx', '.tsx'],
    'alias': {
      'pluginlib': path.resolve(desktopDir, 'src/pluginlib'),
      "zlux-base": path.resolve(desktopDir, "../../zlux-platform/base/src"),
      "zlux-interface": path.resolve(desktopDir, "../../zlux-platform/interface/src")
    }
  },
  'module': {
    'rules': [
      {
        /* Javascript source map loader */
        'enforce': 'pre',
        'test': /\.js$/,
        'use': 'source-map-loader',
        'exclude': [
          /\/node_modules\//
        ]
      },
      {
        /* JSON inline loader */
        'test': /\.json$/,
        'use': 'json-loader'
      },
      {
        /* HTML URL resolution loader */
        'test': /\.html$/,
        'use': 'html-loader'
      },
      {
        /* External file loader */
        'test': /\.eot$/,
        'use': 'file-loader?name=[name].[hash:20].[ext]'
      },
      {
        test: /\.(jpg|png|gif|otf|ttf|woff|woff2|cur|ani|svg)$/,
        type: 'asset',
        generator: {
          filename: '[name].[hash:20].[ext]'
        },
        parser: {
          dataUrlCondition: {
            maxSize: 10000
          }
        }
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
        
      },
      {
        /* TS and angular loader */
        'test': /\.(ts|tsx)$/,
        'use': [
          'ts-loader',
        ]
      }
    ]
  },
  "externals": [
    function(context, request, callback) {
      /* TODO: should we share react? */
      if (/(@angular)|(^bootstrap$)|(^jquery$)|(^rxjs\/Rx$)/.test(request)){
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

