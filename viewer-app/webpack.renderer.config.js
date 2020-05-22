const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

[
  {
    test: /\.s?css/,
    loader: [
      {
        loader: MiniCssExtractPlugin.loader,
        options: {
          hmr: process.env.NODE_ENV === 'development',
        },
      },
      'css-loader',
      'sass-loader',
    ],
  },

  {
    test: /\.png$/,
    loader: 'url-loader',
    options: {
      limit: 8192,
    },
  },
  {
    test: /\.config$|\.frames$|\.json5?$/,
    loader: 'json5-loader',
    type: 'javascript/auto',
  },
].forEach((el) => rules.push(el));

module.exports = {
  module: {
    rules,
  },
  plugins: plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.scss'],
  },
};
