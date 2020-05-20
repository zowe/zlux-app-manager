const path = require('path');
const fs = require('fs');
const webpackConfig = require('webpack-config');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const pluginId = JSON.parse(fs.readFileSync('../pluginDefinition.json')).identifier.replace(/\./g, '_');

if (process.env.MVD_DESKTOP_DIR == null) {
  throw new Error('You must specify MVD_DESKTOP_DIR in your environment');
}
try {
  var config = {
    'entry': [
      path.resolve(__dirname, './src/index.tsx')
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

  let basePath = path.resolve(process.env.MVD_DESKTOP_DIR, 'plugin-config/webpack.react.base.js');
  let baseConfig = new webpackConfig.Config().extend(basePath);
  let rules = baseConfig.module.rules;
  for (let i = 0; i < rules.length; i++) {
    if (rules[i].test && rules[i].test.source == '\\.css$') {
      rules.splice(i,1);
      break;
    }
  }
  rules.push({
    test: /\.css$/,
    'use': [
      { 'loader': 'style-loader' },
      {
        'loader': 'css-loader',
        'options': {
          sourceMap: false,
          modules: true,
          localIdentName: pluginId+'__[local]'
        }
      }
    ]
  });
  rules.push({
    test: /\.svg$/,
    loader: 'svg-inline-loader'
  });
  baseConfig.merge(config);
  module.exports = baseConfig;
} catch (e) {
  fs.copyFileSync('tsconfig.json.tmp', 'tsconfig.json');
  fs.copyFileSync('tslint.json.tmp', 'tslint.json');
  throw e;
}
