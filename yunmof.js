'use strict';

var request = require('request');
var parser = require('xml2json');
var fs = require('fs');
var httper = require('./httper');

const API_CREATE_QUN    = 'http://qun.test.yunmof.com/wxbot/qun';
const API_JOIN_QUN      = 'http://qun.test.yunmof.com/wxbot/qun/membership';

var createQun = function(code, owner, assistant, callback) {
  var url = API_CREATE_QUN;
  var body = {
    code: code,
    owner: owner,
    assistant: assistant
  };

  httper.post(url, null, null, body, function(err, data) {
    if (err) return callback(err);
    
    var result = JSON.parse(data);
    if (result.error) {
      return callback(
        new Error('云魔方API返回错误：\n' + JSON.stringify(result, null, 2))
      );
    }
    
    return callback(null, result);
  });
};

exports.createQun = createQun;


var joinQun = function(token, nickname, callback) {
  var url = API_JOIN_QUN;
  var body = {
    token: token,
    nickname: nickname
  };

  httper.post(url, null, null, body, function(err, data) {
    if (err) return callback(err);
    
    var result = JSON.parse(data);
    if (result.error) {
      return callback(
        new Error('云魔方API返回错误：\n' + JSON.stringify(result, null, 2))
      );
    }
    
    return callback(null, result);
  });
};

exports.joinQun = joinQun;
