/* eslint-disable @typescript-eslint/no-var-requires */
const webpack = require('webpack');
const { resolve: _resolve } = require('path');
const merge = require('webpack-merge');
const ExtractCssChunks = require('extract-css-chunks-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

const port = 9000;
const context = _resolve(__dirname);
const outPath = _resolve(__dirname, 'dist');

/** @type {import('webpack').Configuration['devServer']} */
const devServer = {
  contentBase: outPath,
  port,
  hot: true,
  hotOnly: true,
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

  const safeOrigin = isProd ? 'file://' : `http://localhost:${port}`;
  const replacePlugin = new webpack.DefinePlugin({
    SAFE_ORIGIN: JSON.stringify(safeOrigin),
  });

  /** @type {import('webpack').Configuration} */
  const common = {
    context,
    mode,
    output: {
      path: outPath,
    },
    devtool: !isProd ? 'inline-source-map' : undefined,
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.vue'],
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
    plugins: [replacePlugin, new ForkTsCheckerWebpackPlugin()],
    devServer,
  };

  return common;
}

module.exports = [
  (env, argv) =>
    merge.smart(getDefault(env, argv), {
      entry: {
        preload: ['./src/preload.ts'],
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
                  transpileOnly: true,
                  onlyCompileBundledFiles: true,
                },
              },
            ],
          },
        ],
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
      devServer: { ...devServer, writeToDisk: true },
    }),
  (env, argv) =>
    merge.smart(getDefault(env, argv), {
      entry: {
        renderer: './src/renderer/index.ts',
      },
      output: {
        filename: 'renderer/renderer.js',
        globalObject: 'self',
        publicPath: '/',
      },
      target: 'web',
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            exclude: [/node_modules/],
            use: [
              {
                loader: 'ts-loader',
                options: {
                  transpileOnly: true,
                  appendTsSuffixTo: [/\.vue$/],
                },
              },
            ],
          },
          {
            test: /\.(sa|sc|c)ss$/,
            use: [
              { loader: 'vue-style-loader' },
              {
                loader: ExtractCssChunks.loader,
                options: {
                  hmr: !(env && env.production),
                  reloadAll: true,
                },
              },
              { loader: 'css-loader' },
              { loader: 'sass-loader' },
            ],
          },
          {
            test: /\.vue$/,
            use: [
              {
                loader: 'vue-loader',
                options: {
                  hotReload: !(env && env.production),
                },
              },
            ],
          },
        ],
      },
      plugins: [
        ...(env && env.production
          ? []
          : [new webpack.HotModuleReplacementPlugin()]),
        new ForkTsCheckerWebpackPlugin({
          vue: true,
          async: true,
          useTypescriptIncrementalApi: false,
        }),
        new ExtractCssChunks(),
        new HtmlWebpackPlugin({
          template: './src/renderer/index.ejs',
          filename: 'renderer/index.html',
        }),
        new VueLoaderPlugin(),
      ],
      devServer,
    }),
];
