'use strict';

var request = require('request');
var parser = require('xml2json');
var fs = require('fs');
var httper = require('./httper');

var getDeviceId = function() {
  return "e" + ("" + Math.random().toFixed(15)).substring(2, 17);
};

var getFormateSyncKey = function(keys) {
  for (var e = keys.List, t = [], o = 0, n = e.length; n > o; o++)
  t.push(e[o].Key + "_" + e[o].Val);
  return t.join("|")
};

var getAppJsUrl = function(entryUrl, callback) {
  httper.get(entryUrl, null, null, function(err, data) {
    if (err) return callback(err);

    var re = /(https:\/\/res.wx.qq.com\/zh_CN\/htmledition\/v2\/js\/webwx.*\.js)/;
    var appUrl = data.match(re)[1];
    return callback(null, appUrl);
  });
};

exports.getAppJsUrl = getAppJsUrl;

var getAppId = function(url, callback) {
  httper.get(url, null, null, function(err, data) {
    if (err) return callback(err);

    var re = /jslogin\?appid\=(wx[0-9a-z]+)\&/;
    var appId = data.match(re)[1];
    return callback(null, appId);
  });
};

exports.getAppId = getAppId;

var jsLogin = function(serviceUrl, redirectUrl, appId, callback) {
  var qs = {
    appid: appId,
    redirect_uri: redirectUrl,
    fun: 'new',
    lang: 'zh_CN',
    _: (new Date()).getTime()
  };

  return httper.get(serviceUrl, null, qs, function(err, data) {
    if (err) {
      return callback(err);
    };

    var re = /window\.QRLogin\.uuid\s\=\s\"(.*)\";$/;
    var matches = data.match(re);
    if (null == matches || matches.length < 2) {
      return callback(
        new Error('无法从返回页代码中解析出二维码识别号！')
      );
    }

    return callback(null, {qrcode: matches[1]});
  });
};

exports.jsLogin = jsLogin;

var downloadQRImage = function(serviceUrl, code, filename, callback) {
  var url = serviceUrl + code;
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
    }
  };

  request(options)
  .on('error', function(err) {
    return callback(err);
  })
  .pipe(fs.createWriteStream(filename))
  .on('error', function(err) {
    return callback(err);
  });

  return callback();
};

exports.downloadQRImage = downloadQRImage;

var getLoginResult = function(loginGate, qrCode, tick, callback) {
  var headers = {
    Accept: '*/*'
  };

  // 用这种方式构成URL，为了解决qrCode是BASE64编码时，
  // 末尾可能出现“==”时被重新编码的问题。
  var url = loginGate + '?loginicon=true&';
  url += 'uuid=' + qrCode + '&tip=0&';
  url += 'r=' + ~new Date + '&';
  url += '_=' + tick;

  httper.get(url, headers, null, function(err, data) {
    if (err) return callback(err);

    var re = /window\.code\=([0-9]+);/;
    var matches = data.match(re);
    if (null == matches || matches.length < 2) {
      return callback(
        new Error('无法从返回页代码中解析出登录状态码！')
      );
    }

    var result = {
      code: parseInt(matches[1])
    };

    if (result.code == 200) {
      re = /window\.redirect_uri\=\"(.+)\";$/;
      result.redirectUrl = data.match(re)[1];
    }

    return callback(null, result);
  });
};

exports.getLoginResult = getLoginResult;

var loginRedirect = function(url, callback) {
  var v2Url = url + '&fun=new&version=v2';
  var headers = {
    Accept: 'application/json, text/plain, */*'
  };

  return httper.get(v2Url, headers, null, function(err, data) {
    if (err) return callback(err);

    var result = parser.toJson(data, {object: true});
    return callback(null, result.error);
  });
};

exports.loginRedirect = loginRedirect;

var webInit = function(url, uin, sid, callback) {
  var qs = {
    r: ~new Date
  };

  var headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
  };

  var body = {
    BaseRequest: {
      Uin: uin,
      Sid: sid,
      Skey: "",
      DeviceID: getDeviceId()
    }
  };

  return httper.post(url, headers, qs, body, callback);
};

exports.webInit = webInit;

var statusNotify = function(url, context, callback) {
  var qs = {
    r: ~new Date
  };

  var headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
  };

  var body = {
    BaseRequest: {
      Uin: context.wxuin,
      Sid: context.wxssid,
      Skey: context.skey,
      DeviceID: getDeviceId()
    },
    ClientMsgId: (new Date()).getTime(),
    Code: 3,
    FromUserName: context.User.UserName,
    ToUserName: context.User.UserName
  };

  return httper.post(url, headers, qs, body, callback);
};

exports.statusNotify = statusNotify;

var getContacts = function(url, context, callback) {
  var qs = {
    r: (new Date()).getTime(),
    seq: 0,
    skey: context.skey
  };

  var headers = {
    Accept: 'application/json, text/plain, */*'
  };

  httper.get(url, headers, qs, function(err, data) {
    if (err) return callback(err);

    return callback(null, JSON.parse(data));
  });
};

exports.getContacts = getContacts;

var batchGetContact = function(url, context, type, callback) {
  var qs = {
    type: type,
    r: (new Date()).getTime()
  };

  var headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
  };

  var list = context.ChatSet;

  var body = {
    BaseRequest: {
      Uin: context.wxuin,
      Sid: context.wxsid,
      Skey: context.skey,
      DeviceID: getDeviceId()
    },
    Count: list.length,
    List: [],
  };

  for (var i in list) {
    body.List.push({UserName: list[i], EncryChatRoomId: ''});
  }

  return httper.post(url, headers, qs, body, callback);
};

exports.batchGetContact = batchGetContact;

var syncCheck = function(url, context, tick, callback) {
  var qs = {
    r: (new Date()).getTime(),
    skey: context.skey,
    sid: context.wxsid,
    uin: context.wxuin,
    deviceid: getDeviceId(),
    synckey: getFormateSyncKey(context.SyncKey),
    _: tick
  };

  var headers = {
    Accept: '*/*'
  };

  httper.get(url, headers, qs, function(err, data) {
    if (err) return callback(err);

    var re = /\{retcode\:\"([0-9]+)\",selector\:\"([0-9]+)\"\}/;
    var result = {
      retcode: parseInt(data.match(re)[1]),
      selector: parseInt(data.match(re)[2])
    };

    return callback(null, result);
  });
};

exports.syncCheck = syncCheck;

var webSync = function(url, context, callback) {
  var qs = {
    sid: context.wxsid,
    skey: context.skey
  };

  var headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
  };

  var body = {
    BaseRequest: {
      Uin: context.wxuin,
      Sid: context.wxsid,
      Skey: context.skey,
      DeviceID: getDeviceId()
    },
    SyncKey: context.SyncKey,
    rr: ~new Date
  };

  httper.post(url, headers, qs, body, callback);
};

exports.webSync = webSync;

var verifyUser = function(url, context, username, ticket, callback) {
  var qs = {
    r: ~new Date
  };

  var headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
  };

  var body = {
    BaseRequest: {
      Uin: context.wxuin,
      Sid: context.wxsid,
      Skey: context.skey,
      DeviceID: getDeviceId()
    },
    Opcode: 3,
    VerifyUserListSize: 1,
    VerifyUserList: [
      {
        Value: username,
        VerifyUserTicket: ticket
      }
    ],
    VerifyContent: "",
    SceneListCount: 1,
    SceneList: [33],
    skey: context.SKey
  };


  return httper.post(url, headers, qs, body, callback);
};

exports.verifyUser = verifyUser;

var sendMsg = function(url, context, receiver, content, callback) {
  var headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
  };

  var msgId = (new Date()).getTime() + '' + Math.random().toFixed(3).replace(".", "");

  var body = {
    BaseRequest: {
      Uin: context.wxuin,
      Sid: context.wxsid,
      Skey: context.skey,
      DeviceID: getDeviceId()
    },
    Msg: {
      Type: 1,
      Content: content,
      FromUserName: context.User.UserName,
      ToUserName: receiver,
      LocalID: msgId,
      ClientMsgId: msgId
    },
    Scene: 0
  };

  return httper.post(url, headers, null, body, callback);
};

exports.sendMsg = sendMsg;

var createChatRoom = function(url, context, topic, members, callback) {
  var qs = {
    r: (new Date()).getTime()
  };

  var headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
  };

  var body = {
    BaseRequest: {
      Uin: context.wxuin,
      Sid: context.wxsid,
      Skey: context.skey,
      DeviceID: getDeviceId()
    },
    Topic: topic,
    MemberCount: members.length,
    MemberList: [],
  };

  for (var i in members) {
    body.MemberList.push({UserName: members[i]});
  }

  return httper.post(url, headers, qs, body, callback);
};

exports.createChatRoom = createChatRoom;
