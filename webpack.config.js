const HtmlPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const path = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'darkforces.js'
  },
  module: {
    rules: [
      {
        test: /libtimidity\.wasm$/,
        type: 'javascript/auto',
        loader: 'file-loader',
        options: {
          publicPath: '/'
        }
      },
      {
        test: /\.m?js$/,
        loader: 'babel-loader',
      },
      {
        test: /\.(frag|vert|glsl)$/,
        loader: 'glsl-shader-loader'
      },
      {
        test: /\.worker\.js$/,
        loader: 'worker-loader'
      }
    ]
  },
  plugins: [
    new HtmlPlugin({
      template: './src/index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: 'public' }
      ]
    })
  ],
  devServer: {
    contentBase: path.resolve(__dirname, 'public')
  }
}
