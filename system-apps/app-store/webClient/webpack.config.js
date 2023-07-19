/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

const path = require('path');
const { merge } = require('webpack-merge');
const CopyWebpackPlugin = require('copy-webpack-plugin');

if (process.env.MVD_DESKTOP_DIR == null) {
  throw new Error('You must specify MVD_DESKTOP_DIR in your environment');
}

const config = {
  entry: [
    path.resolve(__dirname, './src/index.tsx'),
  ],
  output: {
    path: path.resolve(__dirname, '../web'),
    filename: 'main.js',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, './src/assets'),
          to: path.resolve('../web/assets')
        }
      ]
    })
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      },
    ]
  }
};

module.exports = merge(
  require(path.resolve(process.env.MVD_DESKTOP_DIR, 'plugin-config/webpack5.react.base.js')),
  config,
);
