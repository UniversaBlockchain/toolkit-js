const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'toolkit.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'Universa',
    libraryTarget: 'umd'
  },
  // module: {
  //   rules: [
  //     {
  //       test: /\.js$/,
  //       exclude: /(node_modules|bower_components)/,
  //       use: {
  //         loader: 'babel-loader'
  //       }
  //     }
  //   ]
  // }
};
