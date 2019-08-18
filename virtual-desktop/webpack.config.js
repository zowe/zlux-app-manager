

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

const path = require('path');
var CopyWebpackPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

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
      "app": path.resolve(__dirname, "src/app"),
      "pluginlib": path.resolve(__dirname, "src/pluginlib"),
      "virtual-desktop-logger": path.resolve(__dirname, "src/app/shared/logger.ts"),
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
    "./src/polyfills.ts",
    "./src/desktop.ts"
  ],
  "output": {
    "path": path.resolve(__dirname, "web"),
    "filename": "desktop.js",
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
        "test": /\.json$/,
        "loader": "json-loader"
      },
      {
        "test": /\.html$/,
        "loader": "raw-loader"
      },
      {
        "test": /\.(eot|svg)$/,
        "loader": "file-loader?name=[name].[hash:20].[ext]"
      },
      {
        "test": /\.(jpg|png|gif|otf|ttf|woff|woff2|cur|ani)$/,
        "loader": "url-loader?name=[name].[hash:20].[ext]&limit=10000"
      },
      {
        "test": /\.css$/,
        "use": [
          "exports-loader?module.exports.toString()",
          {
            "loader": "css-loader",
            "options": {
              "sourceMap": false
            }
          }
        ]
      },
      {
        "test": /\.ts$/,
        loaders: [
          'ts-loader',
          'angular2-template-loader'
        ]
      },
      {
        "test": /@angular\/common\/locales\/.*\.js/,
        "use": [
          "exports-loader"
        ]
      },
    ]
  },
  'plugins': [
    new CopyWebpackPlugin([
      {
        from: path.resolve(__dirname, './node_modules/@angular/common/locales'),
        to: path.resolve('./web/locales')
      },
      {
        from: path.resolve(__dirname, './src/assets/i18n'),
        to: path.resolve('./web/assets/i18n')
      }
    ]),
    new CompressionPlugin({
      threshold: 100000,
      minRatio: 0.8
    })
  ],
  mode: 'production',
  "externals": [
    function(context, request, callback) {
      if (/(@angular)|(angular\-l10n)|(^bootstrap$)|(^popper.js$)|(^jquery$)|(^rxjs\/Rx$)/.test(request)){
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


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

