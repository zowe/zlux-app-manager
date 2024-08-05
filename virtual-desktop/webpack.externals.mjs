

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import webpack from 'webpack';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import CompressionPlugin from 'compression-webpack-plugin';
import linkerPlugin from '@angular/compiler-cli/linker/babel';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
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
      },
      {
        "test": /\.[cm]?js$/,
        "use": {
          loader: 'babel-loader',
          "options": {
            compact: false,
            plugins: [ linkerPlugin ],
          },
        },
        "resolve": {
          fullySpecified: false
        }
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


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

