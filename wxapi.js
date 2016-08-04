'use strict';

var request = require('request');
var parser = require('xml2json');
var fs = require('fs');
var async = require('async')
const url = require('url');

var httper = require('./httper');
var logger = require('./logger')('./applog.json');

const WXAPI_JSLOGIN = 'https://login.wx.qq.com/jslogin';
const WXAPI_LOGIN_REDIRECT = 'https://web.weixin.qq.com/cgi-bin/mmwebwx-bin/webwxnewloginpage';
const WXAPI_QR = 'https://login.weixin.qq.com/qrcode/';
const WXAPI_LOGIN = 'https://login.wx.qq.com/cgi-bin/mmwebwx-bin/login';

const WXAPI_INIT              = '/cgi-bin/mmwebwx-bin/webwxinit';
const WXAPI_GET_CONTACTS      = '/cgi-bin/mmwebwx-bin/webwxgetcontact';
const WXAPI_STATUS_NOTIFY     = '/cgi-bin/mmwebwx-bin/webwxstatusnotify';
const WXAPI_BATCH_GET_CONTACT = '/cgi-bin/mmwebwx-bin/webwxbatchgetcontact';
const WXAPI_SYNC_CHECK        = '/cgi-bin/mmwebwx-bin/synccheck';
const WXAPI_WEB_SYNC          = '/cgi-bin/mmwebwx-bin/webwxsync';
const WXAPI_VERIFY_USER       = '/cgi-bin/mmwebwx-bin/webwxverifyuser';
const WXAPI_SEND_MSG          = '/cgi-bin/mmwebwx-bin/webwxsendmsg';
const WXAPI_CREATE_CHAT_ROOM  = '/cgi-bin/mmwebwx-bin/webwxcreatechatroom';
const WXAPI_UPDATE_CHAT_ROOM  = '/cgi-bin/mmwebwx-bin/webwxupdatechatroom';
const WXAPI_GET_VOICE         = '/cgi-bin/mmwebwx-bin/webwxgetvoice';
const WXAPI_GET_ICON          = '/cgi-bin/mmwebwx-bin/webwxgeticon';
const WXAPI_GET_IMAGE         = '/cgi-bin/mmwebwx-bin/webwxgetmsgimg';

const MT = {
  MSGTYPE_TEXT: 1,
  MSGTYPE_IMAGE: 3,
  MSGTYPE_VOICE: 34,
  MSGTYPE_VIDEO: 43,
  MSGTYPE_MICROVIDEO: 62,
  MSGTYPE_EMOTICON: 47,
  MSGTYPE_APP: 49,
  MSGTYPE_VOIPMSG: 50,
  MSGTYPE_VOIPNOTIFY: 52,
  MSGTYPE_VOIPINVITE: 53,
  MSGTYPE_LOCATION: 48,
  MSGTYPE_STATUSNOTIFY: 51,
  MSGTYPE_SYSNOTICE: 9999,
  MSGTYPE_POSSIBLEFRIEND_MSG: 40,
  MSGTYPE_VERIFYMSG: 37,
  MSGTYPE_SHARECARD: 42,
  MSGTYPE_SYS: 1e4,
  MSGTYPE_RECALLED: 10002,
  StatusNotifyCode_READED: 1,
  StatusNotifyCode_ENTER_SESSION: 2,
  StatusNotifyCode_INITED: 3,
  StatusNotifyCode_SYNC_CONV: 4
};

function webwx(entry) {
  this.entry = entry;
  this.logined = false;
  this.preloaded = false;
  this.tick = (new Date()).getTime();
  this.context = {};
  this.contacts = {};
};

webwx.prototype.onQR = function(e) {
  this.cbQR = e;
  return this;
};

webwx.prototype.onPreloaded = function(e) {
  this.cbPreloaded = e;
  return this;
};

webwx.prototype.onUpdate = function(e) {
  this.cbUpdate = e;
  return this;
};

webwx.prototype.onNewContact = function(e) {
  this.cbNewContact = e;
  return this;
};

webwx.prototype.onFMessage = function(e) {
  this.cbFMessage = e;
  return this;
};

webwx.prototype.onSysMessage = function(e) {
  this.cbSysMessage = e;
  return this;
};

webwx.prototype.onTextMessage = function(e) {
  this.cbTextMessage = e;
  return this;
};

webwx.prototype.onImgMessage = function(e) {
  this.cbImgMessage = e;
  return this;
};

webwx.prototype.onVoiceMessage = function(e) {
  this.cbVoiceMessage = e;
  return this;
};

webwx.prototype.onVideoMessage = function(e) {
  this.cbVideoMessage = e;
  return this;
};

webwx.prototype.onMicroVideoMessage = function(e) {
  this.cbMicroVideoMessage = e;
  return this;
};

webwx.prototype.wxUrl = function(subdomain, path) {
  return this.wxBaseUrl.protocol + '//' +
    (subdomain ? subdomain + '.' : '') + this.wxBaseUrl.hostname + path;
};

var isRoomContact = function(e) {
  return e ? /^@@|@chatroom$/.test(e) : !1;
};

webwx.prototype.isMyRoom = function(e) {
  return e.OwnerUin == this.context.User.Uin || 
    e.ChatRoomOwner == this.context.User.UserName;
};

var batchGetContact = function(url, context, list, type, callback) {
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

var rmdir = function(dirPath) {
  try { var files = fs.readdirSync(dirPath); }
  catch(e) { return; }
  if (files.length > 0)
    for (var i = 0; i < files.length; i++) {
      var filePath = dirPath + '/' + files[i];
      if (fs.statSync(filePath).isFile())
        fs.unlinkSync(filePath);
      else
        rmDir(filePath);
    }
    fs.rmdirSync(dirPath);
};

var rm = function(path) {
  try {
    if (fs.statSync(path).isFile())
      fs.unlinkSync(path);
  } catch(e) {
    if (e.code != 'ENOENT') throw e;
  }
};

webwx.prototype.enableLog = function(path) {
  this.log_path = path;
  logger = require('./logger')(path + '/log.json');

  try {
    rm(this.log_path + '/applog.json');
    rm(this.log_path + '/contact.json');
    rm(this.log_path + '/context.json');
    rm(this.log_path + '/incoming.log');
    fs.mkdirSync(this.log_path);
    fs.mkdirSync(this.log_path + '/voices');
    fs.mkdirSync(this.log_path + '/images');
    fs.mkdirSync(this.log_path + '/headimgs');
  } catch(e) {
    if (e.code != 'EEXIST') throw e;
  }
};

webwx.prototype.dumpContext = function() {
    fs.writeFileSync(
      this.log_path + '/context.json',
      JSON.stringify(this.context, null, 2),
      'utf8'
    );
};

webwx.prototype.dumpContacts = function() {
    fs.writeFileSync(
      this.log_path + '/contact.json',
      JSON.stringify(this.contacts, null, 2),
      'utf8'
    );
};

webwx.prototype.addContact = function(e) {
  if (!(e.UserName in this.contacts)) return this.contacts[e.UserName] = e;

  for (var n in e) {
    this.contacts[e.UserName][n] = e[n];
  }
};

webwx.prototype.findRoomByNick = function(e) {
  for (var id in this.contacts) {
    var c = this.contacts[id];
    if (isRoomContact(c.UserName) && c.NickName == e) return c;
  }

  return null;
};

webwx.prototype.updateContactList = function(idList, callback) {
  var self = this;
  var url = this.wxUrl(null, WXAPI_BATCH_GET_CONTACT );
  batchGetContact(url, this.context, idList, 'ex', function(err, result) {
    if (err) return callback(err);

    var list = result.ContactList;
    for (var i in list) {
      self.addContact(list[i]);

      var member = list[i];
      if (isRoomContact(member.UserName) && self.isMyRoom(member)) {
        //this.updateRoom(member, false);
      }
    }

    logger.debug('共更新了 ' + list.length + ' 个联系人资料！');
    self.dumpContacts();
    return callback(null, result);
  });
};

var getAppJsUrl = function(entryUrl, callback) {
  httper.get(entryUrl, null, null, function(err, data) {
    if (err) return callback(err);

    var appUrl = null;
    var re = /(https:\/\/res.wx.qq.com\/zh_CN\/htmledition\/v2\/js\/webwx.*\.js)/;
    var matches = data.match(re);
    matches && matches.length > 1 && (appUrl = matches[1]);

    if (!appUrl) {
      return callback(
        new Error('无法从返回页代码中解析出核心js模块地址！')
      );
    }

    return callback(null, appUrl);
  });
};

var getAppId = function(url, callback) {
  httper.get(url, null, null, function(err, data) {
    if (err) return callback(err);

    var re = /jslogin\?appid\=(wx[0-9a-z]+)\&/;
    var appId = data.match(re)[1];
    return callback(null, appId);
  });
};

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

var doLogin = function(entry, qrCallback, callback) {
  async.waterfall([
    function(callback) {
      logger.debug('打开微信Web首页: ' + entry);
      logger.info('尝试获取微信核心js模块地址...');

      getAppJsUrl(entry, function(err, jsUrl) {
        if (err) return callback(err);

        logger.debug('核心js模块地址: ' + jsUrl);
        return callback(null, jsUrl);
      });
    },
    function(jsUrl, callback) {
      logger.info('开始下载核心js模块...');

      getAppId(jsUrl, function(err, appId) {
        if (err) return callback(err);

        logger.debug('成功解析AppId: ' + appId);
        return callback(null, appId);
      });
    },
    function(appId, callback) {
      logger.info('尝试连接js登录服务，获取二维码...');

      jsLogin(WXAPI_JSLOGIN, WXAPI_LOGIN_REDIRECT, appId, function(err, result) {
        if (err) return callback(err);

        logger.debug('解析出二维码识别号: ' + result.qrcode);
        qrCallback(WXAPI_QR + result.qrcode);
        return callback(null, result.qrcode);
      });
    },
  ], function(err, result) {
    return callback(err, result);
  });
};

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

webwx.prototype.waitForScanning = function(callback) {
  getLoginResult(WXAPI_LOGIN, this.qrcode, this.tick, function(err, result) {
    this.tick += 1;
    if (err) return callback();

    if (result.code == 201) {
      logger.info('用户已经扫码，等待确认...');
    } else if (result.code == 200) {
      logger.debug('扫码确认完成，跳转至：' + result.redirectUrl);
      return callback(null, result.redirectUrl);
    } else if (result.code == 400) {
      return callback(new Error('等待扫码超时！'));
    } else {
      logger.debug('等待用户扫码，状态：' + result.code);
    }

    return callback();
  }.bind(this));
};

webwx.prototype.preload = function(callback) {
  var self = this;
  async.waterfall([
    function(callback) {
      logger.info('开始跳转...');
      loginRedirect(self.loginedRedirect, function(err, result) {
        if (err) return callback(err);

        self.context.wxuin = result.wxuin;
        self.context.wxsid = result.wxsid;
        self.context.skey = result.skey;
        self.context.passTicket = result.pass_ticket;

        logger.info('读取到关键登录授权信息！');
        return callback(null);
      });
    },
    function(callback) {
      logger.info('开始读取用户基本信息...');
      var url = self.wxUrl(null, WXAPI_INIT);
      var context = self.context;
      webInit(url, context.wxuin, context.wxsid, function(err, result) {
        if (err) return callback(err);

        context.User = result.User;
        context.SyncKey = result.SyncKey;
        context.ChatSet = result.ChatSet.split(',');

        logger.debug('读取到用户【' + result.User.NickName + '】的基本信息！');

        if (self.log_path) {
          fs.writeFileSync(
            self.log_path + '/incoming.log',
            ''
          );
          self.dumpContext();
        }
        return callback();
      });
    },
    function(callback) {
      logger.info('切换用户至在线状态...');
      var url = self.wxUrl(null, WXAPI_STATUS_NOTIFY);
      statusNotify(url, self.context, function(err, result) {
        if (err) return callback(err);

        return callback();
      });
    },
    function(callback) {
      logger.info('获取联系人信息...');
      var url = self.wxUrl(null, WXAPI_GET_CONTACTS);
      getContacts(url, self.context, function(err, result) {
        if (err) return callback(err);

        var members = result.MemberList;
        for (var i in members) {
          var member = members[i];
          self.addContact(member);

          if (isRoomContact(member.UserName) && self.isMyRoom(member)) {
            //updateRoom(member, false);
          }

          //if (members[i].NickName == _dummy_name) {
          //  _dummy = member.UserName;
          //}
        }

        logger.debug('共发现 ' + result.MemberCount + ' 个联系人');

        self.dumpContacts();
        return callback();
      });
    },
    function(callback) {
      logger.info('更新最近互动联系人资料...');
      return self.updateContactList(self.context.ChatSet, callback);
    }
  ], function(err, qrcode) {
    if (err) return callback(err);
    return callback(null, 'ok');
  });

};

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
    var matches = data.match(re);

    if (!matches || matches.length <= 0) {
      return callback(new Error(data.toString()));
    }

    var result = {
      retcode: parseInt(matches[1]),
      selector: parseInt(matches[2])
    };

    return callback(null, result);
  });
};

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

var syncUpdate = function(self, callback) {
  logger.info('💓 💓 💓 💓 💓 💓  ' + self.tick);
  var url = self.wxUrl(null, WXAPI_SYNC_CHECK);
  syncCheck(url, self.context, self.tick, function(err, result) {
    self.tick += 1;

    if (err) {
      return callback(null, self, null);
    }

    if (result.retcode != 0) {
      return callback(new Error('心跳同步中断！\n' + result.toString()));
    }

    if (result.selector > 0) {
      logger.debug('本轮共有 ' + result.selector + ' 条新消息, 立即拉取！')
      var url = self.wxUrl(null, WXAPI_WEB_SYNC);
      return webSync(url, self.context, function(err, result) {
        if (err || !result) {
          return callback(null, self, null);
        }

        self.context.SyncKey = result.SyncKey;
        return callback(null, self, result);
      });
    }

    return callback(null, self, null);
  });
};

webwx.prototype.onContactDel = function(entry, callback) {
  if (entry.UserName in this.contacts) {
    logger.debug('好友 <' + this.contacts[entry.UserName].NickName + '> 已经删除！');
    delete this.contacts[entry.UserName];
  }
  return callback();
};

webwx.prototype.onContactMod = function(entry, callback) {
  var exists = (entry.UserName in this.contacts);
  this.addContact(entry);
  if (exists) {
    logger.debug('好友 <' + entry.NickName + '> 资料已经更新！');
    return callback();
  } else {
    if (isRoomContact(entry.UserName)) {
      logger.debug('群 <' + entry.NickName + '> 资料已经更新！');
      if (this.isMyRoom(entry)) {
        //updateRoom(entry, false);
      }
      return callback();
    } else {
      this.cbNewContact && this.cbNewContact(entry);
    }

    logger.debug('新增好友 <' + entry.NickName + '>！');
    return callback();
  }
};

webwx.prototype.onStatusNotifySync = function(from, msg, callback) {
  var o = msg.StatusNotifyUserName.split(',');
  var s = [];
  for (var i in o) {
    var e = o[i];
    isRoomContact(e) && s.push(e);
  }

  logger.warn('共收到状态通知 <' + s.length + '> 个');
  return this.updateContactList(s, callback);
};

webwx.prototype.processMsg = function(msg, callback) {
  var from = this.contacts[msg.FromUserName];
  if (!from && this.context.User.UserName == msg.FromUserName) {
    from = this.context.User;
  }

  if (!from) {
    var errMsg = JSON.stringify(msg, null, 2);
    logger.error(errMsg);
    return callback(
      new Error('在联系人列表中找不到消息发送者，原始消息如下：\n' + errMsg)
    );
  }

  logger.debug('---------------------------------------------------');
  logger.debug('> [' + msg.MsgType + '] ' + from.UserName + ' (' + from.NickName + ')');
  logger.debug('> ' + httper.htmlDecode(msg.Content));
  logger.debug('---------------------------------------------------');
  logger.debug('');

  if (msg.FromUserName == 'fmessage') {
    if (this.cbFMessage) return this.cbFMessage(from, msg, callback);
    return callback();
  } else if (msg.MsgType == MT.MSGTYPE_SYS) {
    if (this.cbSysMessage) return this.cbSysMessage(from, msg, callback);
    return callback();
  } else if (msg.MsgType == MT.MSGTYPE_STATUSNOTIFY) {
    if (msg.StatusNotifyCode == MT.StatusNotifyCode_SYNC_CONV) {
      return this.onStatusNotifySync(from, msg, callback);
    }
    return callback();
  } else if (msg.MsgType == MT.MSGTYPE_TEXT) {
    if (this.cbTextMessage) return this.cbTextMessage(from, msg, callback);
    return callback();
  } else if (msg.MsgType == MT.MSGTYPE_IMAGE) {
    if (this.cbImgMessage) return this.cbImgMessage(from, msg, callback);
    return callback();
  } else if (msg.MsgType == MT.MSGTYPE_VOICE) {
    if (this.cbVoiceMessage) return this.cbVoiceMessage(from, msg, callback);
    return callback();
  } else if (msg.MsgType == MT.MSGTYPE_VIDEO) {
    if (this.cbVideoMessage) return this.cbVideoMessage(from, msg, callback);
    return callback();
  } else if (msg.MsgType == MT.MSGTYPE_MICROVIDEO) {
    if (this.cbMicroVideoMessage) return this.cbMicroVideoMessage(from, msg, callback);
    return callback();
  }

  return callback();
};

var aiUpdate = function(self, incoming, callback) {
  if (incoming == null)
    return callback();

  fs.appendFileSync(
    self.log_path + '/incoming.log',
    JSON.stringify(incoming, null, 2) + '\n\n'
  );

  async.waterfall([
    function(callback) {
      async.each(incoming.DelContactList, function(entry, callback) {
        return self.onContactDel(entry, callback);
      }, function(err) {
        if (err) return callback(err);
        return callback();
      });
    },
    function(callback) {
      async.each(incoming.ModContactList, function(entry, callback) {
        return self.onContactMod(entry, callback);
      }, function(err) {
        if (err) return callback(err);
        return callback();
      });
    },
    function(callback) {
      async.each(incoming.AddMsgList, function(msg, callback) {
        return self.processMsg(msg, callback);
      }, function(err) {
        if (err) return callback(err);
        return callback();
      });
    }
  ], function(err, result) {
    self.dumpContacts();
    return callback(err, result);
  });
};

webwx.prototype.mainLoop = function() {
  var updateCallback = function() {
    if (!this.cbUpdate) {
      return setTimeout(function() {this.mainLoop();}.bind(this), 100);
    }

    this.cbUpdate(function(err, result) {
      if (!err) {
        return setTimeout(function() {this.mainLoop();}.bind(this), 100);
      }
    }.bind(this));
  };

  if (!this.logined) {
    return this.waitForScanning(function(err, result) {
      if (err) {
        logger.error('等待扫码过程发生未知错误，具体如下：');
        logger.error(err);
        return process.exit(-1001);
      }

      if (result) {
        this.logined = true;
        this.loginedRedirect = result;
        this.wxBaseUrl = url.parse(result);
      }

      return setTimeout(function() {this.mainLoop();}.bind(this), 100);
    }.bind(this));
  }

  if (!this.preloaded) {
    return this.preload(function(err, result) {
      if (err) {
        logger.error('加载用户基本信息过程发生未知错误，具体如下：');
        return logger.error(err);
      }

      if (result) {
        this.preloaded = true;
        this.cbPreloaded && this.cbPreloaded();
      }

      return setTimeout(function() {this.mainLoop();}.bind(this), 100);
    }.bind(this));
  }

  async.waterfall([
    async.apply(syncUpdate, this),
    aiUpdate
  ], function(err, result) {
    if (err) {
      logger.error('消息循环处理过程出现未知错误，具体如下：');
      return logger.error(err);
    }

    updateCallback.bind(this)();
  }.bind(this));
};

webwx.prototype.start = function(callback) {
  doLogin(this.entry, this.cbQR, function(err, result) {
    if (err) return callback(err);
    this.qrcode = result;
    this.mainLoop();
  }.bind(this));
};

module.exports = webwx;

var getDeviceId = function() {
  return "e" + ("" + Math.random().toFixed(15)).substring(2, 17);
};

var getFormateSyncKey = function(keys) {
  for (var e = keys.List, t = [], o = 0, n = e.length; n > o; o++)
  t.push(e[o].Key + "_" + e[o].Val);
  return t.join("|")
};

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
    },
    timeout: 15e3
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

webwx.prototype.verifyUser = function(username, ticket, callback) {
  var url = this.wxUrl(null, WXAPI_VERIFY_USER);
  var context = this.context;
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

webwx.prototype.sendMsg = function(receiver, content, callback) {
  var url = this.wxUrl(null, WXAPI_SEND_MSG);
  var context = this.context;
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

webwx.prototype.createChatRoom = function(topic, members, callback) {
  var url = this.wxUrl(null, WXAPI_CREATE_CHAT_ROOM);
  var context = this.context;
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

webwx.prototype.addToChatRoom = function(room, member, callback) {
  var url = this.wxUrl(null, WXAPI_UPDATE_CHAT_ROOM);
  var context = this.context;
  var qs = {
    fun: 'addmember'
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
    AddMemberList: member,
    ChatRoomName: room
  };

  return httper.post(url, headers, qs, body, callback);
};

webwx.prototype.delFromChatRoom = function(room, member, callback) {
  var url = this.wxUrl(null, WXAPI_UPDATE_CHAT_ROOM);
  var context = this.context;

  var qs = {
    fun: 'delmember'
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
    DelMemberList: member,
    ChatRoomName: room
  };

  return httper.post(url, headers, qs, body, callback);
};

webwx.prototype.downloadVoice = function(msgId, callback) {
  var headers = {
    Accept: '*/*',
    'Accept-Encoding': 'identity;q=1, *;q=0',
    Range: 'bytes=0-'
  };

  var url = this.wxUrl(null, WXAPI_GET_VOICE);
  url += '?msgid=' + msgId;
  url += '&skey=' + this.context.skey;

  var filename = this.log_path + '/voices/' + msgId + '.mp3';
  httper.stream(url, headers, null, filename, callback);
};

webwx.prototype.downloadIcon = function(username, callback) {
  var headers = {
    Accept: 'image/webp,image/*,*/*;q=0.8'
  };

  var url = this.wxUrl(null, WXAPI_GET_ICON);
  url += '?seq=0&username=' + username;
  url += '&skey=' + this.context.skey;

  var filename = this.log_path + '/headimgs/' + username + '.jpg';
  httper.stream(url, headers, null, filename, callback);
};

webwx.prototype.downloadImage = function(msgId, callback) {
  var headers = {
    Accept: 'image/webp,image/*,*/*;q=0.8'
  };

  var url = this.wxUrl(null, WXAPI_GET_IMAGE);
  url += '?MsgID=' + msgId;
  url += '&skey=' + this.context.skey;

  var filename = this.log_path + '/images/' + msgId + '.jpg';
  httper.stream(url, headers, null, filename, callback);
};
