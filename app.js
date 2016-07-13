'use strict';

var async = require('async');
const url = require('url');
var fs = require('fs');

var httper = require('./httper');
var wxapi = require('./wxapi');
var yunmof = require('./yunmof');

const WX_ENTRY_URL = 'https://web.weixin.qq.com/';
const WXAPI_JSLOGIN = 'https://login.wx.qq.com/jslogin';
const WXAPI_LOGIN_REDIRECT = 'https://web.weixin.qq.com/cgi-bin/mmwebwx-bin/webwxnewloginpage';
const WXAPI_QR = 'https://login.weixin.qq.com/qrcode/';
const WXAPI_LOGIN = 'https://login.wx.qq.com/cgi-bin/mmwebwx-bin/login';

const WXAPI_INIT              = '/cgi-bin/mmwebwx-bin/webwxinit';
const WXAPI_STATUS_NOTIFY     = '/cgi-bin/mmwebwx-bin/webwxstatusnotify';
const WXAPI_GET_CONTACTS      = '/cgi-bin/mmwebwx-bin/webwxgetcontact';
const WXAPI_BATCH_GET_CONTACT = '/cgi-bin/mmwebwx-bin/webwxbatchgetcontact';
const WXAPI_SYNC_CHECK        = '/cgi-bin/mmwebwx-bin/synccheck';
const WXAPI_WEB_SYNC          = '/cgi-bin/mmwebwx-bin/webwxsync';
const WXAPI_VERIFY_USER       = '/cgi-bin/mmwebwx-bin/webwxverifyuser';
const WXAPI_SEND_MSG          = '/cgi-bin/mmwebwx-bin/webwxsendmsg';
const WXAPI_CREATE_CHAT_ROOM  = '/cgi-bin/mmwebwx-bin/webwxcreatechatroom';

var _tick = 0;
var _qrcode = '';
var _loginedRedirect = '';
var _logined = false;
var _loaded = false;
var _context = {};
var _wxBaseUrl = null;
var _contacts = {};
var _dummy = '';
var _rooms = {};

if (process.argv.length <= 3) {
  console.log("用法: node app.js [机器人ID] [静默者昵称]");
  process.exit(-1);
}

var _botid = process.argv[2];
var _dummy_name = process.argv[3];
var _log_path = './log/' + _botid;

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

try {
  rmdir(_log_path);
  fs.mkdirSync(_log_path);
} catch(e) {
  if (e.code != 'EEXIST') throw e;
}

var logger = require('./logger')(_log_path + '/applog.json');
logger.info('机器人<' + _botid + '> 启动，静默者：' + _dummy_name);

var wxUrl = function(subdomain, path) {
  return _wxBaseUrl.protocol + '//' +
    (subdomain ? subdomain + '.' : '') + _wxBaseUrl.hostname + path;
};

var dumpContext = function() {
    fs.writeFileSync(
      _log_path + '/context.json',
      JSON.stringify(_context, null, 2),
      'utf8'
    );
};

var dumpContacts = function() {
    fs.writeFileSync(
      _log_path + '/contact.json',
      JSON.stringify(_contacts, null, 2),
      'utf8'
    );
};

var onStrangerInviting = function(msg, callback) {
  var url = wxUrl(null, WXAPI_VERIFY_USER);
  var username = msg.RecommendInfo.UserName;
  var ticket = msg.RecommendInfo.Ticket;
  var nickname = msg.RecommendInfo.NickName;
  
  logger.debug('收到 <' + nickname + '> 的添加好友邀请...');
  wxapi.verifyUser(url, _context, username, ticket, function(err, result) {
    if (err) return callback(err);
    
    if (result.BaseResponse.Ret != 0) {
      return callback(
        new Error('接受添加好友邀请时出现错误，详情：' + result.BaseResponse.ErrMsg)
      );
    }

    return callback();
  });
};

var onCreateQun = function(code, members, callback) {
  var owner = _contacts[members[0]];
  logger.debug('用户 <' + owner.NickName + '> 请求建群...');
  yunmof.createQun(code, owner.NickName, _botid, function(err, result) {
    if (err) return callback(err);
    
    var qunName = result.qun_create_response.name;
    var qunUrl = result.qun_create_response.url;
    var qunid = result.qun_create_response.qunid;
    
    logger.debug('用户 <' + owner.NickName + '> 建群操作获得许可，群名：' + qunName);
  
    var url = wxUrl(null, WXAPI_CREATE_CHAT_ROOM);
    wxapi.createChatRoom(url, _context, qunName, members, function(err, result) {
      if (err) return callback(err);
      
      logger.debug('付费群 <' + qunName + '> 创建成功！');

      _rooms[qunid] = {
        name: qunName,
        url: qunUrl,
        username: result.ChatRoomName
      };

      var url = wxUrl(null, WXAPI_SEND_MSG);
      async.waterfall([
        function(callback) {
          var msg = '付费群“' + result.Topic + '”创建成功！回复“我要提现”可将群收入提现至微信钱包！\n\n' + qunUrl;
          wxapi.sendMsg(url, _context, owner.UserName, msg, function(err, result) {
            if (err) return callback(err);
            callback();
          });
        },
        function(callback) {
          var msg = '付费群“' + result.Topic + '”创建成功！';
          wxapi.sendMsg(url, _context, result.ChatRoomName, msg, function(err, result) {
            if (err) return callback(err);
            callback();
          });
        }
      ], function(err, result) {
        return callback(err, result);
      });
    });
  });
};

var onJoinQun = function(code, username, callback) {
  var nickname = _C[username].NickName;
  logger.debug('用户<' + nickname + '>提交群令牌<' + code + '>，尝试入群');
  apiJoinQun(code, nickname, function(err, result) {
    if (err) return callback(err);

    for (var i in _C) {
      if (_C[i].NickName == result.name) {
        logger.debug('令牌有效, 正在将用户<' + nickname + '>加入群<' + result.name + '>');
        return callback();
      }
    }

    msg = '加群过程中出现异常：找不到编号为(' + result.qunid + '), 名称为(' +
      result.name + ')的微信群，操作终止！';

    return callback(new Error(msg));
  });
};

var onContactDel = function(entry, callback) {
  if (entry.UserName in _contacts) {
    logger.debug('好友 <' + _contacts[entry.UserName].NickName + '> 已经删除！');
    delete _contacts[entry.UserName];
  }
  return callback();
};

var onContactMod = function(entry, callback) {
  var exists = (entry.UserName in _contacts);
  _contacts[entry.UserName] = entry;;
  if (exists) {
    logger.debug('好友 <' + entry.NickName + '> 资料已经更新！');
    return callback();
  } else {
    if (entry.MemberCount && entry.MemberCount > 0) {
      return callback();
    }

    logger.debug('新增好友 <' + entry.NickName + '>！');
    return welcomeNewcomer(entry.UserName, callback);
  }
};

var welcomeNewcomer = function(username, callback) {
  var url = wxUrl(null, WXAPI_SEND_MSG);
  var msg = '[抱拳] 欢迎使用呱呱群管家，请回复群编号/群口令继续完成建群操作！';
  return wxapi.sendMsg(url, _context, username, msg, callback);
};

var processMsg = function(msg, callback) {
  /*
     logger.debug('---------------------------------------------------');
     logger.debug('> ' + msg.MsgType);
     logger.debug('> ' + msg.FromUserName + ": " + httper.htmlDecode(msg.Content));
     logger.debug('---------------------------------------------------');
     logger.debug('');
     */

  if (msg.FromUserName == 'fmessage') {
    return onStrangerInviting(msg, callback);
  } else if (msg.MsgType == 1) {
    var cmd = msg.Content;

    if (cmd.length == 16) {
      var members = [
        msg.FromUserName,
        _dummy
      ];
      return onCreateQun(cmd, members, callback);
    } else if (cmd.length == 19) {
      return onJoinQun(cmd, msg.FromUserName, callback);
    }
  }

  return callback();
};

var syncUpdate = function(callback) {
  logger.info('💓 💓 💓 💓 💓 💓 ');
  var url = wxUrl(null, WXAPI_SYNC_CHECK);
  wxapi.syncCheck(url, _context, _tick, function(err, result) {
    if (err) return callback(err);

    _tick += 1;

    if (result.retcode != 0) {
      return callback(new Error('心跳同步中断！'));
    }

    if (result.selector > 0) {
      logger.debug('本轮共有 ' + result.selector + ' 条新消息, 立即拉取！')
      var url = wxUrl(null, WXAPI_WEB_SYNC);
      return wxapi.webSync(url, _context, function(err, result) {
        _context.SyncKey = result.SyncKey;
        return callback(null, result);
      });
    }

    return callback(null, null);
  });
};

var aiUpdate = function(incoming, callback) {
  if (incoming == null)
    return callback();

  fs.appendFileSync(
    _log_path + '/incoming.log',
    JSON.stringify(incoming, null, 2) + '\n\n'
  );

  async.waterfall([
    function(callback) {
      async.each(incoming.DelContactList, onContactDel, function(err) {
        if (err) return callback(err);
        return callback();
      });
    },
    function(callback) {
      async.each(incoming.ModContactList, onContactMod, function(err) {
        if (err) return callback(err);
        return callback();
      });
    },
    function(callback) {
      async.each(incoming.AddMsgList, processMsg, function(err) {
        if (err) return callback(err);
        return callback();
      });
    }
  ], function(err, result) {
    return callback(err, result);
  });
};

var waitForScanning = function(callback) {
  wxapi.getLoginResult(WXAPI_LOGIN, _qrcode, _tick, function(err, result) {
    if (err) return callback(err);

    if (result.code == 201) {
      logger.info('用户已经扫码，等待确认...');
    } else if (result.code == 200) {
      logger.debug('扫码确认完成，跳转至：' + result.redirectUrl);
      return callback(null, result.redirectUrl);
    } else {
      logger.debug('等待用户扫码，状态：' + result.code);
    }

    _tick += 1;
    return callback();
  });
};

var loadAfterLogin = function(callback) {
  async.waterfall([
    function(callback) {
      logger.info('开始跳转...');

      wxapi.loginRedirect(_loginedRedirect, function(err, result) {
        if (err) return callback(err);

        _context.wxuin = result.wxuin;
        _context.wxsid = result.wxsid;
        _context.skey = result.skey;
        _context.passTicket = result.pass_ticket;

        logger.info('读取到关键登录授权信息！');
        return callback(null);
      });
    },
    function(callback) {
      logger.info('开始读取用户基本信息...');
      var url = wxUrl(null, WXAPI_INIT);
      wxapi.webInit(url, _context.wxuin, _context.wxsid, function(err, result) {
        if (err) return callback(err);

        _context.User = result.User;
        _context.SyncKey = result.SyncKey;
        _context.ChatSet = result.ChatSet.split(',');

        logger.debug('读取到用户【' + result.User.NickName + '】的基本信息！');

        fs.writeFileSync(
          _log_path + '/incoming.log',
          ''
        );
        dumpContext();
        return callback();
      });
    },
    function(callback) {
      logger.info('切换用户至在线状态...');
      var url = wxUrl(null, WXAPI_STATUS_NOTIFY);
      wxapi.statusNotify(url, _context, function(err, result) {
        if (err) return callback(err);

        return callback();
      });
    },
    function(callback) {
      logger.info('获取联系人信息...');
      var url = wxUrl(null, WXAPI_GET_CONTACTS);
      wxapi.getContacts(url, _context, function(err, result) {
        if (err) return callback(err);

        var members = result.MemberList;
        for (var i in members) {
          _contacts[members[i].UserName] = members[i];

          if (members[i].NickName == _dummy_name) {
            _dummy = members[i].UserName
          }
        }

        logger.debug('共发现 ' + result.MemberCount + ' 个联系人');

        dumpContacts();
        return callback();
      });
    },
    function(callback) {
      logger.info('更新最近互动联系人资料...');
      var url = wxUrl(null, WXAPI_BATCH_GET_CONTACT );
      wxapi.batchGetContact(url, _context, 'ex', function(err, result) {
        if (err) return callback(err);

        var list = result.ContactList;
        for (var i in list) {
          _contacts[list[i].UserName] = list[i];
        }

        logger.debug('共发现 ' + list.length + ' 个最近互动联系人');
        dumpContacts();
        return callback();
      });
    }
  ], function(err, qrcode) {
    if (err) return callback(err);
    return callback(null, 'ok');
  });
};

var mainLoop= function() {
  if (!_logined) {
    return waitForScanning(function(err, result) {
      if (err) {
        logger.error('等待扫码过程发生未知错误，具体如下：');
        return logger.error(err);
      }

      if (result) {
        _logined = true;
        _loginedRedirect = result;
        _wxBaseUrl = url.parse(result);
      }

      setTimeout(mainLoop, 100);
    });
  }

  if (!_loaded) {
    return loadAfterLogin(function(err, result) {
      if (err) {
        logger.error('加载用户基本信息过程发生未知错误，具体如下：');
        return logger.error(err);
      }

      if (result) {
        _loaded = true;
      }

      setTimeout(mainLoop, 100);
    });
  }

  async.waterfall([syncUpdate, aiUpdate], function(err, result) {
    if (err) {
      logger.error('消息循环处理过程出现未知错误，具体如下：');
      return logger.error(err);
    }

    return setTimeout(mainLoop, 1000);
  });
};

async.waterfall([
  function(callback) {
    logger.debug('打开微信Web首页: ' + WX_ENTRY_URL);
    logger.info('尝试获取微信核心js模块地址...');

    _context.wxapi = wxapi;

    wxapi.getAppJsUrl(WX_ENTRY_URL, function(err, jsUrl) {
      if (err) return callback(err);

      logger.debug('核心js模块地址: ' + jsUrl);
      return callback(null, jsUrl);
    });
  },
  function(jsUrl, callback) {
    logger.info('开始下载核心js模块...');

    wxapi.getAppId(jsUrl, function(err, appId) {
      if (err) return callback(err);

      logger.debug('成功解析AppId: ' + appId);
      return callback(null, appId);
    });
  },
  function(appId, callback) {
    logger.info('尝试连接js登录服务，获取二维码...');

    wxapi.jsLogin(WXAPI_JSLOGIN, WXAPI_LOGIN_REDIRECT, appId, function(err, result) {
      if (err) return callback(err);

      logger.debug('解析出二维码识别号: ' + result.qrcode);
      return callback(null, result.qrcode);
    });
  },
  function(code, callback) {
    logger.info('下载二维码图片...');

    var filename = 'qrs/' + _botid + '.jpg';
    wxapi.downloadQRImage(WXAPI_QR, code, filename, function(err) {
      if (err) return callback(err);

      logger.debug('二维已经下载到文件: ' + filename);
      return callback(null, code);
    });
  }
], function(err, qrcode) {
  if (err) {
    logger.error('登录过程发生未知错误，具体如下：');
    return logger.error(err);
  };

  _tick = (new Date()).getTime();
  logger.info('登录会话开始时间计数<' + _tick + '>，请扫描二维码！');

  _qrcode = qrcode;
  mainLoop();
});
