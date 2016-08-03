'use strict';
var request = require('request');
var fs = require('fs');
var cpm = require('child_process');
var logger = require('./logger')('./applog.json');
var webwx = require('./wxapi');

var downloadQR = function(url, filename) {
  var options = {
    uri: url,
    method: 'GET',
    headers: {
      'Connection': 'keep-alive',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache',
      'Accept': 'image/webp,image/*,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.86 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4'
    },
    timeout: 15e3
  };

  request(options)
  .on('error', function(err) {
    return;
  })
  .pipe(fs.createWriteStream(filename))
  .on('error', function(err) {
    return;
  })
  .on('finish', function(err) {
    cpm.exec('open "' + filename + '"', {cwd: './'});
    return;
  });
};

const ENTRY_URL = 'https://web.weixin.qq.com/';
var client = new webwx(ENTRY_URL);

client.enableLog('./log/test');

client.onQR(function(imgUrl, callback) {
  logger.debug('下载二维码：' + imgUrl);
  return downloadQR(imgUrl, 'qrs/qr.jpg', callback);
}).onPreloaded(function() {
  logger.debug('共发现联系人: ' + client.contacts.length + ' 个');
}).onMessage(function(msgs, callback) {
  return callback();
}).start(function(err, result) {
  if (err) {
    return logger.error(err);
  }

  return logger.info(result);
});
