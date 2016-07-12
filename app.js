var request = require('request');
var async = require('async');
var fs = require('fs');
const url = require('url');
var parser = require('xml2json');

var entryUrl = 'https://web.weixin.qq.com/';
var entryUrl2 = 'https://www.google.com/';
var tick = 0;
var qr = '';
var jar = request.jar()
var wxBaseUrl = null;
var context = {};
var secondary = '';
var _C = {};
var _R = {};

var wxUrl = function(subdomain, path) {
  return wxBaseUrl.protocol + '//' +
    (subdomain ? subdomain + '.' : '') + wxBaseUrl.hostname + path;
};

var htmlDecode = function(e) {
    return e && 0 != e.length ? e.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&") : "";
};

var dumpContext = function() {
    fs.writeFileSync(
      'log/context.json',
      JSON.stringify(context, null, 2),
      'utf8'
    );
};

var GET = function(url, headers, qs, callback) {
  var options = {
    uri: url,
    method: 'GET',
    headers: {
      'Connection': 'keep-alive',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.86 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4'
    },
    jar: jar
  };

  if (qs) {
    options.useQuerystring = true;
    options.qs = qs;
  }

  if (headers) {
    for (var k in headers) {
      options.headers[k] = headers[k];
    }
  }

  request.get(options, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    return callback(null, body);
  });
};

var POST = function(url, headers, qs, body, callback) {
  var options = {
    uri: url,
    method: 'POST',
    headers: {
      'Connection': 'keep-alive',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.86 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4'
    },
    formData: body,
    jar: jar
  };

  if (qs) {
    options.useQuerystring = true;
    options.qs = qs;
  }

  if (headers) {
    for (var k in headers) {
      options.headers[k] = headers[k];
      if (headers[k].indexOf('application/json') >= 0) {
        delete options['formData'];
        options.json = body;
      }
    }
  }

  request.post(options, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    return callback(null, body);
  });
};

var getAppUrl = function(url, callback) {
  return GET(url, null, null, function(err, data) {
    if (err) {
      return callback(err);
    };

    var re = /(https:\/\/res.wx.qq.com\/zh_CN\/htmledition\/v2\/js\/webwx.*\.js)/;
    var appUrl = data.match(re)[1];
    console.log('<sys> 成功获取 appUrl: ' + appUrl);
    return callback(null, appUrl);
  });
};

var getAppId = function(url, callback) {
  return GET(url, null, null, function(err, data) {
    if (err) {
      return callback(err);
    };

    var re = /jslogin\?appid\=(wx[0-9a-z]+)\&/;
    var appId = data.match(re)[1];
    console.log('<sys> 成功获取 appId: ' + appId);
    return callback(null, appId);
  });
};

var getQREntry = function(appId, callback) {
  var url = 'https://login.wx.qq.com/jslogin';
  var qs = {
    appid: appId,
    redirect_uri: 'https://web.weixin.qq.com/cgi-bin/mmwebwx-bin/webwxnewloginpage',
    fun: 'new',
    lang: 'zh_CN',
    _: (new Date()).getTime()
  };

  return GET(url, null, qs, function(err, data) {
    if (err) {
      return callback(err);
    };

    var re = /window\.QRLogin\.uuid\s\=\s\"(.*)\";$/;
    var qrCode = data.match(re)[1];
    console.log('<sys> 成功获取二维码识别号: ' + qrCode);
    qr = qrCode;
    return callback(null, qrCode);
  });
};

var getQRImage = function(entryCode, callback) {
  var url = 'https://login.weixin.qq.com/qrcode/' + entryCode;
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

  var filename = 'qrs/login.jpg';
  request(options).pipe(fs.createWriteStream(filename));
  console.log('<sys> 二维码图片 -> ' + filename);
  return callback(null, filename);
};

var getLoginResult = function(qrCode, callback) {
  var url = 'https://login.wx.qq.com/cgi-bin/mmwebwx-bin/login';
  var qs = {
    loginicon: true,
    uuid: qrCode,
    tip: 1,
    r: ~new Date,
    _: tick
  };

  var headers = {
    Accept: '*/*'
  };

  url = 'https://login.wx.qq.com/cgi-bin/mmwebwx-bin/login?loginicon=true&';
  url += 'uuid=' + qrCode + '&tip=0&';
  url += 'r=' + ~new Date + '&';
  url += '_=' + tick;

  return GET(url, headers, null, function(err, data) {
    if (err) {
      return callback(err);
    };

    var re = /window\.code\=([0-9]+);/;
    var code = data.match(re)[1];

    if (code == '201') {
      console.log('<sys> 已经扫码，等待确认...');
    } else if (code == '200') {
      re = /window\.redirect_uri\=\"(.+)\";$/;
      var redirUrl = data.match(re)[1];
      console.log('<sys> 登录跳转: ' + redirUrl);
      return callback(null, redirUrl);
    } else {
      console.log('<sys> 等待扫码，状态: ' + code);
    }

    return callback(null, null);
  });

};

var wxGetContacts = function(callback) {
  var url = wxUrl(null, '/cgi-bin/mmwebwx-bin/webwxgetcontact');
  var qs = {
    r: (new Date()).getTime(),
    seq: 0,
    skey: context.SKey
  };

  var headers = {
    Accept: 'application/json, text/plain, */*'
  };

  return GET(url, headers, qs, function(err, data) {
    if (err) {
      return callback(err);
    };

    var jsr = JSON.parse(data);
    var members = jsr.MemberList;
    for (var i in members) {
      _C[members[i].UserName] = members[i];
      if (members[i].NickName == '王政娇') {
        secondary = members[i].UserName
      }
    }

    var fmtjsr = JSON.stringify(jsr, null, 2);
    fs.writeFileSync('contacts.json', fmtjsr, 'utf8');
    printContacts(jsr.MemberList);
    return callback();
  });
};

var wxBatchGetContact = function(list, type, callback) {
  var url = wxUrl(null, '/cgi-bin/mmwebwx-bin/webwxbatchgetcontact');
  var qs = {
    type: type,
    r: (new Date()).getTime()
  };

  var headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
  };

  var body = {
    BaseRequest: {
      Uin: context.uin,
      Sid: context.sid,
      Skey: context.SKey,
      DeviceID: getDeviceId()
    },
    Count: list.length,
    List: [],
  };

  for (var i in list) {
    body.List.push({UserName: list[i], EncryChatRoomId: ''});
  }

  console.log('<sys> 批量获取联系人资料，共 ' + list.length + ' 人 ...');
  
  return POST(url, headers, qs, body, callback);

};

var updateChatSet = function(callback) {
  wxBatchGetContact(context.ChatSet, 'ex', function(err, result) {
    if (err) return callback(err);

    var list = result.ContactList;
    for (var i in list) {
      _C[list[i].UserName] = list[i];
    }

    var js = JSON.stringify(result, null, 2);
    fs.writeFileSync('chatset.json', js, 'utf8');
    return callback();
  });
};

var getCookie = function (cookies, e) {
  for (var t = e + "=", o = cookies.split(";"), n = 0; n < o.length; n++) {
    for (var r = o[n];" " == r.charAt(0);) {
      r = r.substring(1);
    }
    
    if (-1 != r.indexOf(t)) return r.substring(t.length, r.length);
  }
  return "";
};

var loginRedirect = function(url, callback) {
  var v2Url = url + '&fun=new&version=v2';
  var headers = {
    Accept: 'application/json, text/plain, */*'
  };

  return GET(v2Url, headers, null, function(err, data) {
    if (err) {
      return callback(err);
    }
   
    var r = parser.toJson(data, {object: true});
    console.log(JSON.stringify(r, null, 2));

    context.passTicket = r.error.pass_ticket;

    var cookies = jar.getCookieString(url);
    return callback(
      null,
      r.error.wxuin,
      r.error.wxsid
    );
  });
};

var getDeviceId = function() {
      return "e" + ("" + Math.random().toFixed(15)).substring(2, 17);
};

var printContacts = function(contacts) {
  for (var i in contacts) {
    var c = contacts[i];
    console.log('+++ ' + c.UserName + ' ' + c.NickName + ' (' + c.Alias + ')');
  }
};

var wxInit = function(uin, sid, callback) {
  var url = wxUrl(null, '/cgi-bin/mmwebwx-bin/webwxinit');
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

  console.log('<sys> 获取用户资料...');
  
  return POST(url, headers, qs, body, function(err, data) {
    if (err) {
      return callback(err);
    };

    context.uin = uin;
    context.sid = sid;
    context.User = data.User;
    context.SKey = data.SKey;
    context.SyncKey = data.SyncKey;
    context.ChatSet = data.ChatSet.split(',');

    dumpContext();

    printContacts(data.ContactList);
    return callback(null);
  });
};

var wxStatusNotify = function(callback) {
  var url = wxUrl(null, '/cgi-bin/mmwebwx-bin/webwxstatusnotify');
  var qs = {
    r: ~new Date
  };

  var headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
  };

  var body = {
    BaseRequest: {
      Uin: context.uin,
      Sid: context.sid,
      Skey: context.SKey,
      DeviceID: getDeviceId()
    },
    ClientMsgId: (new Date()).getTime(),
    Code: 3,
    FromUserName: context.User.UserName,
    ToUserName: context.User.UserName
  };

  console.log('<sys> 切换为在线状态...');
  
  return POST(url, headers, qs, body, function(err, data) {
    if (err) {
      return callback(err);
    };

    return callback();
  });
};

var wxVerifyUser = function(recommendInfo, callback) {
  var url = wxUrl(null, '/cgi-bin/mmwebwx-bin/webwxverifyuser');
  var qs = {
    r: ~new Date
  };

  var headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
  };

  var body = {
    BaseRequest: {
      Uin: context.uin,
      Sid: context.sid,
      Skey: context.SKey,
      DeviceID: getDeviceId()
    },
    Opcode: 3,
    VerifyUserListSize: 1,
    VerifyUserList: [
      {
        Value: recommendInfo.UserName,
        VerifyUserTicket: recommendInfo.Ticket
      }
    ],
    VerifyContent: "",
    SceneListCount: 1,
    SceneList: [
      33
    ],
    skey: context.SKey
  };

  console.log('<sys> 接受 ' + recommendInfo.NickName + ' 的添加好友邀请...');
  
  return POST(url, headers, qs, body, callback);
};

var wxCreateChatRoom = function(topic, members, callback) {
  var url = wxUrl(null, '/cgi-bin/mmwebwx-bin/webwxcreatechatroom');
  var qs = {
    r: (new Date()).getTime()
  };

  var headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
  };

  var body = {
    BaseRequest: {
      Uin: context.uin,
      Sid: context.sid,
      Skey: context.SKey,
      DeviceID: getDeviceId()
    },
    Topic: topic,
    MemberCount: members.length,
    MemberList: [],
  };

  for (var i in members) {
    body.MemberList.push({UserName: members[i]});
  }

  console.log('<sys> 创建新群 <' + topic + '>');
  
  return POST(url, headers, qs, body, callback);
};

var wxSendMsg = function(receiver, content, callback) {
  var url = wxUrl(null, '/cgi-bin/mmwebwx-bin/webwxsendmsg');

  var headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
  };

  var msgId = (new Date()).getTime() + '' + Math.random().toFixed(3).replace(".", "");

  var body = {
    BaseRequest: {
      Uin: context.uin,
      Sid: context.sid,
      Skey: context.SKey,
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

  return POST(url, headers, null, body, callback);
};

var getFormateSyncKey = function(keys) {
  for (var e = keys.List, t = [], o = 0, n = e.length; n > o; o++)
  t.push(e[o].Key + "_" + e[o].Val);
  return t.join("|")
};

var syncCheck = function(callback) {
  var url = wxUrl('webpush', '/cgi-bin/mmwebwx-bin/synccheck');
  var qs = {
    r: (new Date()).getTime(),
    skey: context.SKey,
    sid: context.sid,
    uin: context.uin,
    deviceid: getDeviceId(),
    synckey: getFormateSyncKey(context.SyncKey),
    _: tick
  };

  var headers = {
    Accept: '*/*'
  };

  console.log('<sys> 心跳同步检测'); 

  return GET(url, headers, qs, function(err, data) {
    if (err) {
      return callback(err);
    };

    tick += 1;
    var re = /\{retcode\:\"([0-9]+)\",selector\:\"([0-9]+)\"}/;
    var result = {
      retcode: parseInt(data.match(re)[1]),
      selector: parseInt(data.match(re)[2])
    };

    return callback(null, result);
  });
};

var webSync = function(callback) {
  var url = wxUrl(null, '/cgi-bin/mmwebwx-bin/webwxsync');
  var qs = {
    sid: context.sid,
    skey: context.SKey
  };

  var headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
  };

  var body = {
    BaseRequest: {
      Uin: context.uin,
      Sid: context.sid,
      Skey: context.SKey,
      DeviceID: getDeviceId()
    },
    SyncKey: context.SyncKey,
    rr: ~new Date
  };

  console.log('<sys> Web接口同步...');
  
  return POST(url, headers, qs, body, function(err, data) {
    if (err) {
      return callback(err);
    };

    //console.log(JSON.stringify(data, null, 2));
    return callback(null, data);
  });

};

var apiCreateQun = function(code, owner, assistant, callback) {
  var url = 'http://qun.test.yunmof.com/wxbot/qun';
  var body = {
    code: code,
    owner: owner,
    assistant: assistant
  };

  POST(url, null, null, body, function(err, data) {
    if (err) return callback(err);

    return callback(null, JSON.parse(data));
  });
};

var apiJoinQun = function(token, nickname, callback) {
  var url = 'http://qun.test.yunmof.com/wxbot/qun/membership';
  var body = {
    token: token,
    nickname: nickname
  };

  POST(url, null, null, body, function(err, data) {
    if (err) return callback(err);

    var result = JSON.parse(data);
    if (result.error) return callback(result.err);

    return callback(null, result.membership_join_response);
  });
};

var onStrangerInviting = function(msg, callback) {
  wxVerifyUser(msg.RecommendInfo, function(err, result) {
    console.log(result);

    return callback();
  });
};

var onCreateQun = function(code, members, callback) {
  apiCreateQun(code, _C[members[0]].NickName, context.User.UserName, function(err, result) {
    if (result) {
      var qunName = result.qun_create_response.name;
      var url = result.qun_create_response.url;
      var qunid = result.qun_create_response.qunid;

      wxCreateChatRoom(qunName, members, function(err, result) {
        console.log(result);

        _R[qunid] = {name: qunName, url: url};
        return wxSendMsg(
          result.ChatRoomName,
          '付费群“' + result.Topic + '”创建成功！回复“我要提现”可将群收入提现至微信钱包！\n\n' + url,
          callback
        );
      });
    }
  });
};

var onJoinQun = function(code, username, callback) {
  var nickname = _C[username].NickName;
  console.log('用户<' + nickname + '>提交群令牌<' + code + '>，尝试入群');
  apiJoinQun(code, nickname, function(err, result) {
    if (err) return callback(err);

    for (var i in _C) {
      if (_C[i].NickName == result.name) {
        console.log('令牌有效, 正在将用户<' + nickname + '>加入群<' + result.name + '>');
        return callback();
      }
    }

    msg = '加群过程中出现异常：找不到编号为(' + result.qunid + '), 名称为(' +
      result.name + ')的微信群，操作终止！';

    return callback(new Error(msg));
  });
};

var processMsg = function(msg, callback) {
  console.log('---------------------------------------------------');
  console.log('> ' + msg.MsgType);
  console.log('> ' + msg.FromUserName + ": " + htmlDecode(msg.Content));
  console.log('---------------------------------------------------');
  console.log('');

  if (msg.FromUserName == 'fmessage') {
    return onStrangerInviting(msg, callback);
  } else if (msg.MsgType == 10000) {
    if (msg.Content.indexOf('你已添加了') >= 0) {
      return wxSendMsg(msg.FromUserName, "[抱拳] 欢迎使用呱呱群管家，请回复群编号/群口令继续完成建群操作！", callback);
    }
  } else if (msg.MsgType == 1) {
    var cmd = msg.Content;
    if (cmd.length == 16) {
      var members = [
        msg.FromUserName,
        secondary
      ];
      return onCreateQun(cmd, members, callback);
    } else if (cmd.length == 19) {
      return onJoinQun(cmd, msg.FromUserName, callback);
    }
  }

  return callback();
};

var syncUpdate = function(callback) {
  syncCheck(function(err, data) {
    if (err) return callback(err);
    
    if (data.retcode == 0) {
      if (data.selector > 0) {
        console.log('<sys> 有 ' + data.selector + ' 条新消息！')
        return webSync(function(err, data) {
          return callback(null, data);
        });
      }
      
      return callback(null, null);
    }
    return callback(new Error('<sys> 心跳同步中断'));
  });
};

var aiUpdate = function(data, callback) {
  if (data == null)
    return callback();

  context.SyncKey = data.SyncKey;
  fs.writeFileSync('log/' + (new Date()).getTime() + '.log', JSON.stringify(data, null, 2), 'utf8');

  async.each(data.AddMsgList, processMsg, function(err) {
    if (err) return callback(err);
    return callback();
  });
};

var loopProc = function(callback) {
  async.waterfall([syncUpdate, aiUpdate], function(err, result) {
    if (err) return callback(err);
    return callback(null, result);
  });
};

var mainProc = function(entry) {
  wxBaseUrl = url.parse(entry);

  var doInit = async.compose(updateChatSet, wxGetContacts, wxStatusNotify, wxInit, loginRedirect);
  doInit(entry, function(err, result) {
    if (err) {
      return console.log(err);
    };

    setTimeout(function() {
      var callee = arguments.callee;
      loopProc(function(err) {
        if (err) {
          console.log(err);
          return console.log('<sys> 应用退出');
        }

        setTimeout(callee, 1000);
      });
    }, 1000);
  });
};

var doLogin = async.compose(getQRImage, getQREntry, getAppId, getAppUrl);

doLogin(entryUrl, function(err, result) {
  if (err) {
    return console.log(err);
  };

  console.log('<sys> 请扫码 ' + result + ' 登录');

  tick = (new Date()).getTime();
  setTimeout(function() {
    var callee = arguments.callee;

    getLoginResult(qr, function(err, data) {
      if (err) {
        return console.log(err);
      };

      if (data == null) {
        tick += 1;
        return setTimeout(callee, 1000);
      }

      return mainProc(data);
    });
  }, 100); 
});
