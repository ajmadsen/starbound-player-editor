const webpack = require('webpack'); //eslint-disable-line
const path = require('path'); //eslint-disable-line

/**
 * @param {import('webpack').Configuration} config
 */
module.exports = function (config) {
  const isProd = config.mode === 'production';
  const preload = isProd
    ? `require('path').join(__dirname, '..', 'preload.js')`
    : `${JSON.stringify(path.resolve(config.output.path, '..', 'preload.js'))}`;
  if (!config.plugins) config.plugins = [];
  config.plugins.push(
    new webpack.DefinePlugin({
      PRELOAD_SCRIPT: preload,
    })
  );
  return config;
};
