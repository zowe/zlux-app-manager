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
  devtool: 'source-map',
  output: {
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  resolve: {
    extensions: ['.js', '.ts'],
    alias: {
      pluginlib: path.resolve(desktopDir, 'src/pluginlib'),
      'zlux-base': path.resolve(__dirname, '../../zlux-platform/base/src'),
      'zlux-interface': path.resolve(__dirname, '../../zlux-platform/interface/src')
    }
  },
  module: {
    rules: [
      {
        /* Javascript source map loader */
        enforce: 'pre',
        test: /\.js$/,
        use: 'source-map-loader',
        exclude: /\/node_modules\//
      },
      {
        /* HTML URL resolution loader */
        test: /\.html$/,
        use: 'html-loader'
      },
      {
        test: /\.svg$/,
        use: 'svg-sprite-loader'
      },
      {
        /* External file loader */
        test: /\.eot$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[hash:20].[ext]'
            }
          }
        ]
      },
      {
        /* External (or inline) file loader */
        test: /\.(jpg|png|gif|otf|ttf|woff|woff2|cur|ani)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              name: '[name].[hash:20].[ext]',
              limit: 10000
            }
          }
        ]
      },
      {
        /* CSS URL loader */
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: false
            }
          }
        ]
      },
      {
        /* TS and Angular loader */
        test: /\.ts$/,
        use: [
          'ts-loader',
          'angular2-template-loader'
        ]
      }
    ]
  },
  externals: [
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
