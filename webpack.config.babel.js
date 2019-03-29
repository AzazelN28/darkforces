import webpack from 'webpack'
import HtmlPlugin from 'html-webpack-plugin'
import { resolve } from 'path'

const isDevelopment = process.env.NODE_ENV === 'development'

export default {
  mode: isDevelopment ? 'development' : 'production',

  entry: [
    resolve(__dirname, 'src', 'index.js'),
  ],

  output: {
    publicPath: '/',
    path: resolve(__dirname, 'dist'),
    filename: 'index.js',
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
      },
      {
        test: /\.glsl$/,
        use: 'shader-loader',
      },
    ],
  },

  plugins: [
    new HtmlPlugin({
      template: resolve(__dirname, 'src', 'index.html'),
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],

  devtool: 'source-map',

  devServer: {
    contentBase: resolve(__dirname, 'dist'),
    port: 4000,
    historyApiFallback: true,
    compress: true,
    hot: true,
  },
}
