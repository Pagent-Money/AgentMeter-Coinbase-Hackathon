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

// Load environment variables from service/.env
require('dotenv').config({ path: resolve(__dirname, 'service', '.env') })

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
      'react/jsx-dev-runtime.js': 'react/jsx-dev-runtime',
      'constants/_env': resolve(__dirname, 'shared/constants/env')
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
                ['@babel/env', { 
                  loose: false, 
                  modules: process.env.TARGET === 'browser' ? false : 'commonjs'
                }],
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
        APP_ENV: JSON.stringify(process.env.APP_ENV || 'production'),
        // Supabase Configuration
        SUPABASE_URL: JSON.stringify(process.env.SUPABASE_URL),
        SUPABASE_ANON_KEY: JSON.stringify(process.env.SUPABASE_ANON_KEY),
        SUPABASE_SERVICE_ROLE_KEY: JSON.stringify(process.env.SUPABASE_SERVICE_ROLE_KEY),
        SUPABASE_JWT_SECRET: JSON.stringify(process.env.SUPABASE_JWT_SECRET),
        // OpenAI Configuration
        OPENAI_API_KEY: JSON.stringify(process.env.OPENAI_API_KEY),
        OPENAI_ORGANIZATION: JSON.stringify(process.env.OPENAI_ORGANIZATION),
        OPENAI_TIMEOUT: JSON.stringify(process.env.OPENAI_TIMEOUT),
        OPENAI_MAX_RETRIES: JSON.stringify(process.env.OPENAI_MAX_RETRIES),
        // Service Configuration
        SERVICE_PORT: JSON.stringify(process.env.SERVICE_PORT),
        // X402 Payment Configuration
        X402_PAY_TO_ADDRESS: JSON.stringify(process.env.X402_PAY_TO_ADDRESS),
        X402_FACILITATOR_URL: JSON.stringify(process.env.X402_FACILITATOR_URL),
        X402_NETWORK: JSON.stringify(process.env.X402_NETWORK),
        // API Keys & Secrets
        JWT_SECRET: JSON.stringify(process.env.JWT_SECRET),
        API_SECRET_KEY: JSON.stringify(process.env.API_SECRET_KEY),
        // Rate Limiting
        RATE_LIMIT_WINDOW_MS: JSON.stringify(process.env.RATE_LIMIT_WINDOW_MS),
        RATE_LIMIT_MAX_REQUESTS: JSON.stringify(process.env.RATE_LIMIT_MAX_REQUESTS),
        RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: JSON.stringify(process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS),
        // CORS Configuration
        CORS_ORIGIN: JSON.stringify(process.env.CORS_ORIGIN),
        CORS_CREDENTIALS: JSON.stringify(process.env.CORS_CREDENTIALS),
        // Pricing Configuration
        DEFAULT_REQUEST_PRICE: JSON.stringify(process.env.DEFAULT_REQUEST_PRICE),
        DEFAULT_INPUT_TOKEN_PRICE: JSON.stringify(process.env.DEFAULT_INPUT_TOKEN_PRICE),
        DEFAULT_OUTPUT_TOKEN_PRICE: JSON.stringify(process.env.DEFAULT_OUTPUT_TOKEN_PRICE),
        // Webhook Configuration
        WEBHOOK_SECRET: JSON.stringify(process.env.WEBHOOK_SECRET),
        WEBHOOK_TIMEOUT: JSON.stringify(process.env.WEBHOOK_TIMEOUT),
        // Monitoring & Logging
        LOG_LEVEL: JSON.stringify(process.env.LOG_LEVEL),
        ENABLE_REQUEST_LOGGING: JSON.stringify(process.env.ENABLE_REQUEST_LOGGING),
        ENABLE_ERROR_TRACKING: JSON.stringify(process.env.ENABLE_ERROR_TRACKING),
        // External Services
        STRIPE_SECRET_KEY: JSON.stringify(process.env.STRIPE_SECRET_KEY),
        STRIPE_WEBHOOK_SECRET: JSON.stringify(process.env.STRIPE_WEBHOOK_SECRET),
        // Email Service
        SENDGRID_API_KEY: JSON.stringify(process.env.SENDGRID_API_KEY),
        FROM_EMAIL: JSON.stringify(process.env.FROM_EMAIL),
        // Analytics & Metrics
        ANALYTICS_API_KEY: JSON.stringify(process.env.ANALYTICS_API_KEY),
        METRICS_ENDPOINT: JSON.stringify(process.env.METRICS_ENDPOINT)
      }
    }),
    new webpack.NormalModuleReplacementPlugin(/.\/production/, `./${process.env.APP_ENV || "production"}.json`),
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
    // For server, only include plugins that don't hardcode environment variables
    new webpack.NormalModuleReplacementPlugin(/.\/production/, `./${process.env.APP_ENV || "production"}.json`),
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
    }),
    // Add a minimal DefinePlugin that only sets NODE_ENV and APP_ENV for bundling
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      'process.env.APP_ENV': JSON.stringify(process.env.APP_ENV || 'production')
    })
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
  externals: [nodeExternals({
    allowlist: ['dotenv']
  })],
  node: {
    global: false,
    __filename: false,
    __dirname: false
  },
  plugins: [
    // For service, only include plugins that don't hardcode environment variables
    new webpack.NormalModuleReplacementPlugin(/.\/production/, `./${process.env.APP_ENV || "production"}.json`),
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
    }),
    // Add a minimal DefinePlugin that only sets NODE_ENV and APP_ENV for bundling
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      'process.env.APP_ENV': JSON.stringify(process.env.APP_ENV || 'production')
    })
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
