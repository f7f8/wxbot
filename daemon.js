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
  });
};

var daemonProc = function() {
  yunmof.getQueue(function(err, result) {
    if (err) {
      return console.log(err);
    }

    var queue = result.get_queue_response;
    for (var k in queue) {
      var ownerId = queue[k];

      if (!(ownerId in bots)) {
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
