var request = require('request');
var async = require('async');
var fs = require('fs');
const url = require('url');

var entryUrl = 'https://web.weixin.qq.com/';
var entryUrl2 = 'https://www.google.com/';
var tick = 0;
var qr = '';
var jar = request.jar()
var wxBaseUrl = '';
var context = {};

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
    console.log('成功获取 appUrl: ' + appUrl);
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
    console.log('成功获取 appId: ' + appId);
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
    console.log('成功获取二维码识别号: ' + qrCode);
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

  var filename = 'qrs/' + (new Date()).getTime() + '.jpg';
  request(options).pipe(fs.createWriteStream(filename));
  console.log('二维码图片 -> ' + filename);
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
      console.log('已经扫码，等待确认...');
    } else if (code == '200') {
      re = /window\.redirect_uri\=\"(.+)\";$/;
      var redirUrl = data.match(re)[1];
      console.log('登录跳转: ' + redirUrl);
      return callback(null, redirUrl);
    } else {
      console.log('等待扫码，状态: ' + code);
    }

    return callback(null, null);
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
  return GET(url, null, null, function(err, data) {
    if (err) {
      return callback(err);
    };

    var cookies = jar.getCookieString(url);
    return callback(
      null,
      getCookie(cookies, 'wxuin'),
      getCookie(cookies, 'wxsid')
    );
  });
};

var getDeviceId = function() {
      return "e" + ("" + Math.random().toFixed(15)).substring(2, 17);
};

var wxInit = function(uin, sid, callback) {
  var url = wxBaseUrl + '/cgi-bin/mmwebwx-bin/webwxinit';
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

  console.log('获取用户资料...');
  
  return POST(url, headers, qs, body, function(err, data) {
    if (err) {
      return callback(err);
    };

    context.uin = uin;
    context.sid = sid;
    context.User = data.User;
    context.SKey = data.SKey;
    context.SyncKey = data.SyncKey;

    console.log(JSON.stringify(data, null, 2));
    return callback();
  });
};

var wxStatusNotify = function(callback) {
  var url = wxBaseUrl + '/cgi-bin/mmwebwx-bin/webwxstatusnotify';
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

  console.log('变更用户在线状态...');
  
  return POST(url, headers, qs, body, function(err, data) {
    if (err) {
      return callback(err);
    };

    return callback(null, data);
  });
};

var syncCheck = function(qrCode, callback) {
  var url = 'https://webpush.wx.qq.com/cgi-bin/mmwebwx-bin/synccheck';
  var qs = {
    r: (new Date()).getTime(),
    skey: context.SKey,
    sid: context.sid,
    uin: context.uin,
    deviceid: getDeviceId(),
    loginicon: true,
    uuid: qrCode,
    tip: 1,
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
      console.log('已经扫码，等待确认...');
    } else if (code == '200') {
      re = /window\.redirect_uri\=\"(.+)\";$/;
      var redirUrl = data.match(re)[1];
      console.log('登录跳转: ' + redirUrl);
      return callback(null, redirUrl);
    } else {
      console.log('等待扫码，状态: ' + code);
    }

    return callback(null, null);
  });

};

var mainProc = function(entry) {
  var entryUrl = url.parse(entry);
  wxBaseUrl = entryUrl.protocol + '//' + entryUrl.hostname;

  console.log(wxBaseUrl);

  var doInit = async.compose(wxStatusNotify, wxInit, loginRedirect);
  doInit(entry, function(err, result) {
    if (err) {
      return console.log(err);
    };

    console.log(JSON.stringify(result, null, 2));
    
    setTimeout(function() {
      var callee = arguments.callee;
      setTimeout(callee, 1000);
    }, 1000);
  });
};

var doLogin = async.compose(getQRImage, getQREntry, getAppId, getAppUrl);

doLogin(entryUrl, function(err, result) {
  if (err) {
    return console.log(err);
  };

  console.log('请扫码 ' + result + ' 登录');

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
