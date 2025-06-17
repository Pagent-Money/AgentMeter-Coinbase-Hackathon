const webpack = require('webpack')
const fs = require('fs')
const { resolve, join } = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const nodeExternals = require('webpack-node-externals')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')
const { getIfUtils, removeEmpty } = require('webpack-config-utils')
const { ifProduction, ifNotProduction } = getIfUtils(process.env.NODE_ENV)

const baseConfig = {
  mode: ifProduction('production', 'development'),
  output: {
    path: resolve('static'),
    chunkFilename: ifProduction('scripts/[name].chunk.js?v=[chunkhash]', 'scripts/[name].chunk.js')
  },
  resolve: {
    modules: [
      resolve('shared'),
      resolve('browser'),
      resolve('server'),
      resolve('service'),
      resolve('desktop'),
      'node_modules'
    ],
    extensions: ['.js', '.jsx', '.json', '.mjs'],
    mainFiles: ['index', 'index.web'],
    alias: {
      'react/jsx-runtime.js': 'react/jsx-runtime',
      'react/jsx-dev-runtime.js': 'react/jsx-dev-runtime'
    }
  },
  stats: {
    colors: true,
    reasons: true,
    chunks: false
  },
  experiments: {
    // asset: true
    layers: true,
    asyncWebAssembly: true
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: [
          resolve(__dirname, 'node_modules'),
          resolve(__dirname, 'resources', 'scripts')
        ],
        use: [
          {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              presets: [
                ['@babel/env', { loose: false, modules: false }],
                '@babel/react'
              ],
              plugins: removeEmpty([
                '@babel/plugin-syntax-dynamic-import',
                ['@babel/plugin-proposal-class-properties', { loose: false }],
                '@babel/plugin-transform-runtime',
              ])
            }
          }
        ]
      },
      {
        test: /\.css$/,
        include: resolve(__dirname, 'shared'),
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: {
                localIdentName: '[name]_[local]_[hash:base64:5]'
              }
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  ['precss'],
                  ['autoprefixer']
                ]
              }
            }
          },
        ]
      },
      {
        test: /\.css$/,
        exclude: resolve(__dirname, 'shared'),
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: 'css-loader'
          }
        ]
      },
      {
        test: /\.(ttf|eot|otf|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        include: resolve(__dirname, 'shared', 'resources', 'fonts'),
        type: 'asset',
        generator: {
          filename: ifProduction('fonts/[name][ext]?v=[hash]', 'fonts/[name][ext]'),
        }
      },
      {
        test: /\.(ico|png|jpg|jpeg|svg|gif)$/,
        include: resolve(__dirname, 'shared', 'resources', 'images'),
        type: 'asset',
        generator: {
          filename: ifProduction('images/[name][ext]?v=[hash]', 'images/[name][ext]'),
        }
      },
      {
        test: /\.raw\.js$/,
        include: resolve(__dirname, 'shared'),
        loader: 'raw-loader'
      },
      {
        test: /\.sql$/,
        include: resolve(__dirname, 'shared'),
        loader: 'raw-loader'
      },
      {
        test: /\.hm$/,
        include: resolve(__dirname, 'shared'),
        loader: 'raw-loader'
      },
      {
        test: /\.glsl$/,
        include: resolve(__dirname, 'shared'),
        loader: 'raw-loader'
      }
    ]
  },
  plugins: removeEmpty([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'production'),
        APP_ENV: JSON.stringify(process.env.APP_ENV || 'production')
      }
    }),
    new webpack.NormalModuleReplacementPlugin(/.\/production/, `./${process.env.APP_ENV}.json`),
    new MiniCssExtractPlugin({
      filename: ifProduction('styles/bundle.css?v=[fullhash]', 'styles/bundle.css'),
      chunkFilename: ifProduction('styles/[name].chunk.css?v=[chunkhash]', 'styles/[name].chunk.css')
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: join(__dirname, 'shared/resources/fonts'),
          to: join(__dirname, 'static/fonts')
        },
        {
          from: join(__dirname, 'shared/resources/images'),
          to: join(__dirname, 'static/images')
        }
      ],
    })
  ])
}

const browserConfig = {
  ...baseConfig,
  context: resolve('browser'),
  resolve: {
    ...baseConfig.resolve,
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      path: require.resolve('path-browserify'),
      os: require.resolve('os-browserify/browser'),
      vm: require.resolve('vm-browserify'),
      zlib: require.resolve('browserify-zlib'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      buffer: require.resolve('safe-buffer'),
      'process/browser': require.resolve('process/browser')
    }
  },
  entry: './index.jsx',
  output: {
    ...baseConfig.output,
    filename: ifProduction('scripts/bundle.js?v=[fullhash]', 'scripts/bundle.js'),
    publicPath: '/'
  },
  plugins: removeEmpty([
    ...baseConfig.plugins,
    ifProduction(new webpack.NormalModuleReplacementPlugin(/routes\/sync/, 'routes/async')),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new HtmlWebpackPlugin({
      inject: true,
      minify: { collapseWhitespace: true },
      template: 'index.html',
      appMountId: 'root',
      modalMountId: 'modal',
      mobile: true
    })
  ]),
  devServer: {
    port: 4003,
    static: './browser',
    historyApiFallback: true,
    host: 'localhost',
    client: {
      progress: true
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  }
}

const serverConfig = {
  ...baseConfig,
  target: 'node',
  context: resolve('server'),
  devtool: false,
  entry: './index.js',
  output: {
    ...baseConfig.output,
    filename: 'app.js',
    libraryTarget: 'commonjs2',
    publicPath: '/'
  },
  externals: [nodeExternals()],
  node: {
    global: false,
    __filename: false,
    __dirname: false
  },
  plugins: [
    ...baseConfig.plugins
  ]
}

const serviceConfig = {
  ...baseConfig,
  target: 'node',
  context: resolve('service'),
  devtool: 'source-map',
  entry: './index.js',
  output: {
    ...baseConfig.output,
    filename: 'service.js',
    libraryTarget: 'commonjs2',
    publicPath: '/'
  },
  externals: [nodeExternals()],
  node: {
    global: false,
    __filename: false,
    __dirname: false
  },
  plugins: [
    ...baseConfig.plugins
  ]
}

const configs = {
  browser: browserConfig,
  server: serverConfig,
  service: serviceConfig,
}

process.on('warning', (warning) => {
  console.log('warning', warning.stack);
});

module.exports = configs[process.env.TARGET]
