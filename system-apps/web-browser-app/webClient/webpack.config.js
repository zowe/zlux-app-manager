

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

if (process.env.MVD_DESKTOP_DIR == null) {
  throw new Error('You must specify MVD_DESKTOP_DIR in your environment');
}

var config = {
  mode: 'development',
  entry: [
    path.resolve(__dirname, './src/plugin.ts')
  ],
  output: {
    path: path.resolve(__dirname, '../web/v3'),
    filename: 'main.js',
  },
  module: {
    rules: [
      // SCSS handling
      {
        test: /\.scss$/,
        use: [
          // For development, inject styles into the DOM using 'style-loader'
          // For production, consider using MiniCssExtractPlugin.loader for separate CSS files
          'style-loader', 
          {
            loader: 'css-loader',
            options: {
              sourceMap: true, // Set to false if you don't want source maps for CSS
            },
          },
          'sass-loader', // Compiles Sass to CSS
        ],
      },
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, './src/assets'),
          to: path.resolve(__dirname, '../web/v3/assets')
        },
      ],
    }),
  ]
};

module.exports = new webpackConfig.Config()
  .extend(path.resolve(process.env.MVD_DESKTOP_DIR, 'plugin-config/webpack5.base.js'))
  .merge(config);


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

