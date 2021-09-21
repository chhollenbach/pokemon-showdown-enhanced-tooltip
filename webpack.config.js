const path = require('path');

module.exports = {
  entry: {
    enhancement_suite: './src/enhancement_suite.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, './dest/')
  }
};