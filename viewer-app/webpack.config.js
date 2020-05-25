/* eslint-disable @typescript-eslint/no-var-requires */
const webpack = require('webpack');
const { resolve: _resolve } = require('path');
const merge = require('webpack-merge');
const ExtractCssChunks = require('extract-css-chunks-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const port = 9000;
const context = _resolve(__dirname);
const outPath = _resolve(__dirname, 'dist');

/** @type {import('webpack').Configuration['devServer']} */
const devServer = {
  contentBase: outPath,
  port,
};

/**
 *
 * @param {any} env
 * @param {any} argv
 * @returns {import('webpack').Configuration[]}
 */
function getDefault(env, argv) {
  const isProd = env && env.production;
  const mode = isProd ? 'production' : 'development';

  /** @type {import('webpack').Configuration} */
  const common = {
    context,
    mode,
    output: {
      path: outPath,
    },
    devtool: !isProd ? 'inline-source-map' : undefined,
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: [/node_modules/],
          use: [
            {
              loader: 'ts-loader',
              options: {
                onlyCompileBundledFiles: true,
                transpileOnly: true,
              },
            },
          ],
        },
      ],
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    plugins: [new ForkTsCheckerWebpackPlugin()],
    devServer: { port, writeToDisk: true },
  };

  return common;
}

module.exports = [
  (env, argv) =>
    merge.smart(getDefault(env, argv), {
      entry: {
        preload: ['./src/preload.ts'],
      },
      output: {
        filename: 'preload.js',
      },
      target: 'electron-preload',
      plugins: [
        new webpack.NormalModuleReplacementPlugin(/^path$/, (resource) => {
          resource.request = require.resolve('path-browserify');
          for (const dep of resource.dependencies) {
            dep.request = require.resolve('path-browserify');
            dep.userRequest = require.resolve('path-browserify');
          }
          return resource;
        }),
      ],
    }),
  (env, argv) =>
    merge.smart(getDefault(env, argv), {
      entry: {
        renderer: './src/renderer/index.ts',
      },
      output: {
        filename: 'renderer/renderer.js',
        globalObject: 'self',
      },
      target: 'web',
      module: {
        rules: [
          {
            test: /\.(sa|sc|c)ss$/,
            use: [
              {
                loader: ExtractCssChunks.loader,
                options: { esModules: true, hmr: !(env && env.production) },
              },
              { loader: 'css-loader' },
              { loader: 'sass-loader' },
            ],
          },
        ],
      },
      plugins: [
        new ExtractCssChunks({
          filename: '[name].css',
          chunkFilename: '[id].css',
        }),
        new HtmlWebpackPlugin({
          template: './src/renderer/index.ejs',
          filename: 'renderer/index.html',
        }),
        ...(env && env.production
          ? []
          : [new webpack.HotModuleReplacementPlugin()]),
      ],
      devServer,
    }),
];
