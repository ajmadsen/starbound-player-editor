const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { resolve } = require('path');

const DIST_PATH = resolve(__dirname, 'dist');

/** @type {import('webpack').Configuration} */
module.exports = {
  mode: 'development',
  entry: ['core-js', './src/main.ts'],
  devtool: 'inline-source-map',
  output: {
    path: DIST_PATH,
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.config$|\.frames$|\.json5?$/,
        loader: 'json5-loader',
        type: 'javascript/auto',
      },
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          transpileOnly: true,
          experimentalWatchApi: true,
        },
      },
      {
        test: /\.s?css/,
        loader: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.png$/,
        loader: 'url-loader',
        options: {
          limit: 8192,
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './src/index.html', inject: true }),
    new ForkTsCheckerWebpackPlugin({ useTypescriptIncrementalApi: true }),
  ],
  devServer: {
    contentBase: DIST_PATH,
    compress: true,
    port: 9000,
    stats: 'errors-only',
  },
};
