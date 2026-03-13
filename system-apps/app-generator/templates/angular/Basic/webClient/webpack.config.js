const path = require('path');
const fs = require('fs');
const webpackConfig = require('webpack-config');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

if (process.env.MVD_DESKTOP_DIR == null) {
  throw new Error('You must specify MVD_DESKTOP_DIR in your environment');
}
try {
  var config = {
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
      ]),
      new CompressionPlugin({
        threshold: 10000,
        minRatio: 0.8
      })
    ]
  };

  module.exports = new webpackConfig.Config()
    .extend(path.resolve(process.env.MVD_DESKTOP_DIR, 'plugin-config/webpack.base.js'))
    .merge(config);
} catch (e) {
  fs.copyFileSync('tsconfig.json.tmp', 'tsconfig.json');
  fs.copyFileSync('tslint.json.tmp', 'tslint.json');
  throw e;
}
