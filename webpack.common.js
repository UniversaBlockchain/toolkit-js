const path = require('path');

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
  }
};
