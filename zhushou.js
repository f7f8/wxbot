'use strict';
var request = require('request');
var fs = require('fs');
var cpm = require('child_process');
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

var isRoomContact = function(e) {
  return e ? /^@@|@chatroom$/.test(e) : !1;
};

var getAvls = function(e) {
  var result = [];
  for (var k in e) {
    var c = e[k];
    !isRoomContact(c.UserName) && c.ContactFlag == 3 && c.VerifyFlag == 0 && result.push(c);
  }
  return result;
};

const ENTRY_URL = 'https://web.weixin.qq.com/';
var client = new webwx(ENTRY_URL);

var ownerId = process.argv[2];
var dpath = './log/' + ownerId;
client.enableLog(dpath);
var logger = require('./logger')(dpath + '/applog.json');

var avls = [];
var qi = 2;
var lastTick = new Date().getTime();

var createQun = function(callback) {
  if (qi >= avls.length) return callback();

  var tick = new Date().getTime();
  if (tick - lastTick < 30 * 1000) return callback();
  
  lastTick = new Date().getTime();

  var members = [
    avls[qi].UserName,
    avls[qi + 1].UserName
  ];

  var topic = '老司机带路' + (qi / 2) + '号群！';
  console.log('开始创建群 <' + topic + '> ......');
  client.createChatRoom(topic, members, function(err, result) {
    if (err) {
      console.log('创建群<' + topic + '时出错:\n' + err);
      return callback();
    }
    
    if (!result.ChatRoomName) {
      console.log('创建群<' + topic + '时失败:\n' + JSON.stringify(result, null, 2));
      return callback();
    }

    var roomContact = result.ChatRoomName;
    var msg = '老司机向大家问好';
    qi += 2;

    console.log('创建群 <' + topic + '> 成功！');

    return client.sendMsg(roomContact, msg, callback);
  });
};

client.onQR(function(imgUrl, callback) {
  logger.debug('下载二维码：' + imgUrl);
  return downloadQR(imgUrl, 'qrs/qr.jpg', callback);
}).onPreloaded(function() {
  avls = getAvls(client.contacts);
  logger.info('共发现 ' + avls.length + ' 个有效的个人好友');
}).onMessage(function(msgs, callback) {
  return callback();
}).onUpdate(function(callback) {
  return callback(null);
}).start(function(err, result) {
  if (err) {
    return logger.error(err);
  }

  return logger.info(result);
});
