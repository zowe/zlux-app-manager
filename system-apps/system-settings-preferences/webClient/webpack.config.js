

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
  "resolve": {
    "alias": {
      // Uncomment these to use virtual desktop relative pathing modules, because even importing the tsconfig
      // will still lead to Typescript errors. So we need to supply the relative path manually for any needed aliases
      // "app": path.resolve(__dirname, "src/app"),
      // "pluginlib": path.resolve(__dirname, "src/pluginlib"),
      // "app/application-manager/viewport-manager/viewport/viewport.component": path.resolve(__dirname, "../../../virtual-desktop/src/app/application-manager/viewport-manager/viewport/viewport.component.ts"),
      // "virtual-desktop-logger": path.resolve(__dirname, "../../../virtual-desktop/src/app/shared/logger.ts"),
      // "zlux-base": path.resolve(__dirname, "../../zlux-platform/base/src"),
      // "zlux-interface": path.resolve(__dirname, "../../zlux-platform/interface/src")
    }
  },
  'entry': [
    path.resolve(__dirname, './src/plugin.ts')
  ],
  'output': {
    'path': path.resolve(__dirname, '../web'),
    'filename': 'main.js',
  },
  'plugins': [
    new CopyWebpackPlugin([
      {
        from: path.resolve(__dirname, './src/assets'),
        to: path.resolve('../web/assets')
      }
    ])
  ]
};

module.exports = new webpackConfig.Config()
  .extend(path.resolve(process.env.MVD_DESKTOP_DIR, 'plugin-config/webpack.base.js'))
  .merge(config);


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

