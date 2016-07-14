'use strict';

var request = require('request');
var jar = request.jar()

var htmlDecode = function(e) {
    return e && 0 != e.length ? e.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&") : "";
};

exports.htmlDecode = htmlDecode;

exports.get = function(url, headers, qs, callback) {
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
    jar: jar,
    timeout: 35e3
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

exports.post = function(url, headers, qs, body, callback) {
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
    jar: jar,
    timeout: 35e3
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

