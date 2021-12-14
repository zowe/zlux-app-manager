

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

const path = require('path');
const desktopDir = path.resolve(__dirname, '..');

const config = {
  devtool: 'source-map',
  mode: 'production',
  output: {
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  resolve: {
    extensions: ['.js', '.ts'],
    alias: {
      'pluginlib': path.resolve(desktopDir, 'src/pluginlib'),
      'zlux-base': path.resolve(__dirname, '../../zlux-platform/base/src'),
      'zlux-interface': path.resolve(__dirname, '../../zlux-platform/interface/src')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ['ts-loader', 'angular2-template-loader']
      },
      {
        /* Javascript source map loader */
        enforce: 'pre',
        test: /\.js$/,
        use: ['source-map-loader'],
        exclude: [
          /\/node_modules\//
        ]
      },
      {
        /* HTML URL resolution loader */
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
            options: { esModule: false }
          }
        ]
      },
      {
        test: /\.eot$/,
        type: 'asset/resource',
        generator: {
          filename: '[name].[hash:20].[ext]'
        }
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
        test: /\.css$/,
        use: [{
          loader: 'css-loader',
          options: {
            exportType: 'string',
            esModule: false,
            sourceMap: false
          }
        }]
      }
    ]
  },
  externals: [
    function ({ context, request }, callback) {
      if (/(@angular)|(angular\-l10n)|(^bootstrap$)|(^popper.js$)|(^jquery$)|(^rxjs(\/operators)?$)/.test(request)) {
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

