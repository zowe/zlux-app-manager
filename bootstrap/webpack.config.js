

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

const path = require('path');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { NoEmitOnErrorsPlugin } = require('webpack');

module.exports = {
  "devtool": "source-map",
  "resolve": {
    "extensions": [
      ".ts",
      ".js"
    ],
    "modules": [
      "./node_modules"
    ],
    "alias": {
      "zlux-base": path.resolve(__dirname, "../../zlux-platform/base/src"),
      "zlux-interface": path.resolve(__dirname, "../../zlux-platform/interface/src")
    }
  },
  "resolveLoader": {
    "modules": [
      "./node_modules"
    ]
  },
  "entry": [
    "./src/polyfill.ts",
    "./src/main.ts"
  ],
  "output": {
    "path": path.join(process.cwd(), "web"),
    "filename": "main.js",
    "libraryTarget": "umd"
  },
  "module": {
    "rules": [
      {
        "enforce": "pre",
        "test": /\.js$/,
        "loader": "source-map-loader",
        "exclude": [
          /\/node_modules\//
        ]
      },
      {
        "test": /\.ts$/,
        loaders: [
          'ts-loader'
        ]
      }
    ]
  },
  "plugins": [
    // new NoEmitOnErrorsPlugin(),
    new ProgressPlugin(),
    new HtmlWebpackPlugin({
      "title": "Rocket BlueZone Web",
      "favicon": "./src/assets/favicon.ico"
    })
  ],
  "node": {
    "fs": "empty"
  }
};


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

