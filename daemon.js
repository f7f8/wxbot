'use strict';
const exec = require('child_process').exec;
var yunmof = require('./yunmof');

var bots = {};

var createBot = function(ownerId) {
  var cmd = 'node qun.js ' + ownerId;
  return exec(cmd, {cwd: './'}, function(error, stdout, stderr) {
    if (error) return console.error(`exec error: ${error}`);

    console.log(stdout);
    console.log(stderr);
  }).on('error', function(err) {
    console.log('子进程 [' + ownerId + '] 出错：' + code);
    delete bots[ownerId];
  }).on('exit', function(code) {
    console.log('子进程 [' + ownerId + '] 退出 ' + code);
    delete bots[ownerId];
  });
};

var daemonProc = function() {
  yunmof.getQueue(function(err, result) {
    if (err) {
      console.log('守护进程出现异常:\n' + err);
      return setTimeout(daemonProc, 1000 * 15);
    }

    var queue = result.get_queue_response;
    for (var k in queue) {
      var ownerId = queue[k];

      if (!(ownerId in bots) && ownerId != 543) {
        console.log('生成新机器人 ' + ownerId);
        bots[ownerId] = {
          proc: createBot(ownerId)
        };
      }
    }

    setTimeout(daemonProc, 2000);
  });
};

daemonProc();
