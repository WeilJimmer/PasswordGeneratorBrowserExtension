const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env) => {
  const browser = env.browser || 'chrome';
  const isProduction = env.production === true;
  const mode = isProduction ? 'production' : 'development';

  console.log(`Building for ${browser} in ${mode} mode`);

  const outputDir = path.resolve(__dirname, `dist/${browser}`);

  // 獲取平台特定配置
  const platformConfig = require(`./webpack.${browser}.js`);

  const config = {
    mode,
    devtool: isProduction ? false : 'source-map',
    entry: {
      background: './src/background/background.js',
      options: './src/options/options.js',
      popup: './src/popup/popup.js',
    },
    output: {
      path: outputDir,
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
          { from: `config/${browser}/manifest.json`, to: 'manifest.json' },
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
      extensions: ['.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@modules': path.resolve(__dirname, 'src/modules')
      }
    }
  };

  return { ...config, ...platformConfig };

};