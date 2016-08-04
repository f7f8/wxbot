'use strict';
var request = require('request');
var fs = require('fs');
var parser = require('xml2json');
var cpm = require('child_process');
var webwx = require('./wxapi');
var httper = require('./httper');

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

var getRoomMember = function(r, e) {
  for (var i in r.MemberList) {
    var m = r.MemberList[i];
    if (m.UserName == e) return m;
  }

  return null;
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

if (process.argv.length <= 2) {
  console.log("用法: node app.js [机器人ID]");
  process.exit(-1);
}

var ownerId = process.argv[2];
var dpath = './log/' + ownerId + '-' + (new Date()).getTime();
client.enableLog(dpath);
var logger = require('./logger')(dpath + '/applog.json');

var avls = [];
var qi = 2;
var lastTick = new Date().getTime();

var rooms = {};

var saveRooms = function(callback) {
  fs.writeFileSync(
    dpath + '/chatrooms.json',
    JSON.stringify(rooms, null, 2),
    'utf8'
  );

  return callback();
};

var fetchChatRoom = function(e) {
  var r = rooms[e.UserName] = rooms[e.UserName] || {
    name: e.UserName,
    nick: e.NickName,
    msgs: [],
    members: {}
  };

  return r;
};

var updateMemberProfile = function(r, m) {
  if (!(m.UserName in r.members)) {
    r.members[m.UserName] = {
      name: m.UserName,
      nick: m.NickName
    };

    client.downloadIcon(m.UserName, function(err){});
  }
};

var onQTextMsg = function(from, msg, callback) {
  if (!isRoomContact(from.UserName)) return callback();
  var s = msg.Content.match(/(@[0-9a-f]+)\:\<br\/\>(.+)/);
  var m = getRoomMember(from, s[1]);
  var r = fetchChatRoom(from);
  updateMemberProfile(r, m);

  r.msgs.push({
    id: msg.MsgId,
    type: 'text',
    time: msg.CreateTime,
    content: s[2],
    from: m.UserName
  });

  return saveRooms(callback);
};

var onQVoiceMsg = function(from, msg, callback) {
  if (!isRoomContact(from.UserName)) return callback();
  var s = msg.Content.match(/(@[0-9a-f]+)\:\<br\/\>(.+)/);
  var m = getRoomMember(from, s[1]);
  var r = fetchChatRoom(from);
  updateMemberProfile(r, m);

  var v = parser.toJson(httper.htmlDecode(s[2]), {object: true});
  var vo = {
    size: v.msg.voicemsg.length,
    length: v.msg.voicemsg.voicelength,
    format: v.msg.voicemsg.voiceformat
  }

  r.msgs.push({
    id: msg.MsgId,
    type: 'voice',
    time: msg.CreateTime,
    content: vo,
    from: m.UserName
  });

  logger.info(JSON.stringify(vo, null, 2));

  client.downloadVoice(msg.MsgId, function(err) {
    return saveRooms(callback);
  });
};

var onQImageMsg = function(from, msg, callback) {
  if (!isRoomContact(from.UserName)) return callback();
  var s = msg.Content.match(/(@[0-9a-f]+)\:\<br\/\>(.+)/);
  var m = getRoomMember(from, s[1]);
  var r = fetchChatRoom(from);
  updateMemberProfile(r, m);

  var v = parser.toJson(httper.htmlDecode(s[2]), {object: true});
  var vo = {
    length: v.msg.img.length,
    hd_length: v.msg.img.hdlength,
  }

  r.msgs.push({
    id: msg.MsgId,
    type: 'image',
    time: msg.CreateTime,
    content: vo,
    from: m.UserName
  });

  logger.info(JSON.stringify(vo, null, 2));

  client.downloadImage(msg.MsgId, function(err) {
    return saveRooms(callback);
  });
};


client.onQR(function(imgUrl, callback) {
  logger.debug('下载二维码：' + imgUrl);
  return downloadQR(imgUrl, 'qrs/qr.jpg', callback);
}).onPreloaded(function() {
  avls = getAvls(client.contacts);
  logger.info('共发现 ' + avls.length + ' 个有效的个人好友');
})
.onTextMessage(onQTextMsg)
.onVoiceMessage(onQVoiceMsg)
.onImgMessage(onQImageMsg)
.onVideoMessage(function(from, msg, callback) {
  return callback();
}).onMicroVideoMessage(function(from, msg, callback) {
  return callback();
}).onUpdate(function(callback) {
  return callback(null);
}).start(function(err, result) {
  if (err) {
    return logger.error(err);
  }

  return logger.info(result);
});
