'use strict';

var request = require('request');
var parser = require('xml2json');
var fs = require('fs');
var httper = require('./httper');

const API_BASE          = 'http://qun.test.yunmof.com/wxbot/';
const API_GET_QUEUE     = 'http://qun.test.yunmof.com/wxbot/queue';

var getQueue = function(callback) {
  httper.get(API_GET_QUEUE, null, null, function(err, data) {
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

exports.getQueue = getQueue;

var qrcode = function(owner, qrcode, callback) {
  var url = API_BASE + owner + '/qrcode';
  var body = {
    code: qrcode
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

exports.qrcode = qrcode;

var changeState = function(owner, to, callback) {
  var url = API_BASE + owner + '/state';
  var body = {
    to: to
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

exports.changeState = changeState;

var getInfo = function(owner, callback) {
  var url = API_BASE + owner + '/info';
  httper.get(url, null, null, function(err, data) {
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

exports.getInfo = getInfo;

var updateInfo = function(owner, name, callback) {
  var url = API_BASE + owner + '/info';
  var body = {
    name: name
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

exports.updateInfo = updateInfo;

var joinQun = function(owner, token, nickname, callback) {
  var url = API_BASE + owner + '/member';
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
