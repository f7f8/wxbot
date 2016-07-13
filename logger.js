'use strict';

var winston = require('winston');

module.exports = function(filename) {
  return new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        level: 'debug'
      }),
      new (winston.transports.File)({
        level: 'debug',
        filename: filename
      })
    ]
  })
};
