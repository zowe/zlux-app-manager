

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

var webpack = require('webpack');
var path = require('path');
const CompressionPlugin = require('compression-webpack-plugin');

var config = {
  "entry":  {
    "main": "./src/externals-main.ts",
    "externals": "./src/externals.ts"
  },
  "resolve": {
    "alias": {
      "virtual-desktop-logger": path.resolve(__dirname, "src/app/shared/logger.ts"),
    }
  },
  "output": {
    "filename": "[name].js",
    "path": path.resolve(__dirname, "web")
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
        "use": [ 'ts-loader' ]
      }
    ]
  },
  optimization: {
    moduleIds: 'named'
  },
  mode: 'production',
  plugins: [
    new webpack.ContextReplacementPlugin(
      /angular(\\|\/)core(\\|\/)@angular/,
      path.resolve(__dirname),
      {}
    ),
    new CompressionPlugin({
      threshold: 100000,
      minRatio: 0.8
    })
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

