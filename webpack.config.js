const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
  entry: {
    background: './src/background/background.js',
    popup: './src/popup/popup.js',
    options: './src/options/options.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]/[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/logo.png', to: 'logo.png' },
        { from: 'src/assets', to: 'assets' },
        { from: 'src/_locales', to: '_locales' }
      ]
    }),
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup/popup.html',
      chunks: ['popup'],
      inject: false
    }),
    new HtmlWebpackPlugin({
      template: './src/options/options.html',
      filename: 'options/options.html',
      chunks: ['options'],
      inject: false
    })
  ],
  resolve: {
    extensions: ['.js']
  }
};