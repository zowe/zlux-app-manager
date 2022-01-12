

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
const CompressionPlugin = require('compression-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

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
    },
    fallback: {
      fs: false,
      os: false
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
  "stats": {
    "errorDetails": true
  },
  "module": {
    "rules": [
      {
        "enforce": "pre",
        "test": /\.js$/,
        "use": [ "source-map-loader" ],
        "exclude": [
          /\/node_modules\//
        ]
      },
      {
        "test": /\.ts$/,
        use: [
          'ts-loader'
        ]
      }
    ]
  },
  "mode": "production",
  "plugins": [
    // new NoEmitOnErrorsPlugin(),
    new ProgressPlugin(),
    new HtmlWebpackPlugin({
      "title": "Zowe Desktop"
    }),
    new CopyWebpackPlugin({
      patterns: [
      {
        from: path.resolve(__dirname, './src/assets/i18n'),
        to: path.resolve('./web/assets/i18n')
      }
    ]}),
    new CompressionPlugin({
      threshold: 100000,
      minRatio: 0.8
    })    
  ]
};


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

