

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
const { AngularWebpackPlugin } = require('@ngtools/webpack');
const AotPlugin = require('@ngtools/webpack').AngularWebpackPlugin;

if (process.env.MVD_DESKTOP_DIR == null) {
  throw new Error('You must specify MVD_DESKTOP_DIR in your environment');
}

var config = {
  'entry': [
    path.resolve(__dirname, './src/plugin.ts')
  ],
  output: {
    path: path.resolve(__dirname, '../web/v3'),
    filename: 'main.js',
  },
  resolve: {
    alias: {
      '@zlux/widgets': path.resolve(__dirname, 'node_modules/@zlux/widgets/dist/zlux-widgets/fesm2022/zlux-widgets.mjs'),
      'zlux-widgets': path.resolve(__dirname, 'node_modules/@zlux/widgets/dist/zlux-widgets/fesm2022/zlux-widgets.mjs')
    }
  },
  'plugins': [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, './src/assets'),
          to: path.resolve(__dirname, '../web/v3/assets')
        },
      ],
    }),
    new AotPlugin({
      tsConfigPath: './tsconfig.json',
      entryModule: './src/app/app.module.ts#AppModule'
    })
  ],
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

