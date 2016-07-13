'use strict';

var request = require('request');
var parser = require('xml2json');
var fs = require('fs');
var httper = require('./httper');

const API_CREATE_QUN = 'http://qun.test.yunmof.com/wxbot/qun';

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

