'use strict';
var logger = require('./logger')('./applog.json');
var webwx = require('./wxapi');

const ENTRY_URL = 'https://web.weixin.qq.com/';

var client = new webwx(ENTRY_URL);

client.onQR(function(imgUrl, callback) {
  logger.debug('下载二维码：' + imgUrl);
  return callback();
}).start(function(err, result) {
  if (err) {
    return logger.error(err);
  }

  return logger.info(result);
});
