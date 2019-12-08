const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'toolkit.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'Universa',
    libraryTarget: 'umd'
  },
  node: {
    fs: 'empty'
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  }
};
