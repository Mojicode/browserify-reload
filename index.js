"use strict";

const wrap     = require('browserify-wrap');
const chokidar = require('chokidar');
const WSServer = require('ws').Server;


//this code is serialized and injected client-side
//as it might not be processed by browserify transform, keep it ES5

var connect = function(host, port) {
  var proto = "ws://";
  if(document.location.protocol === "https:") {
    proto = "wss://";
  }
  var sock = new WebSocket(proto + host + ':' + port);
  sock.onopen = function() {
    console.log("Connected to browserify-reload handle");
  }

  sock.onmessage = function(msg){
    if(msg && msg.data == "reload")
      document.location = document.location.href;
  }
};


module.exports = function(b, opts) {
  var deferred = opts.deferred;

  var port = 0;
  var hostname = opts.host || 'document.location.hostname'
  var  wss = new WSServer({ port }, function() {
    port = this.address().port;
    console.log("WS server listening on ", port);

      //late plugin registration, it's okay
    var prefix = `(${connect})(${hostname}, ${port});`;
    b.plugin(wrap, {prefix});
  });


  function broadcast(payload) {
    wss.clients.forEach(function(lnk) {
      lnk.send(payload);
    });
  }

  var reload = function() { broadcast("reload"); }

  if(opts.xfiles)
    opts.xfiles.forEach(function(file_path){
      chokidar.watch(file_path).on('change', reload);
    });


  wss.on('connection', function(ws) {
    console.log("CONNECTED");
  });

  b.on("bundle", function(stream) {
    stream.on("end", function() {
      if(!deferred) {
        console.log("NOW ASKING FOR CLIENT TO RELOAD");
        reload();
      }
    })
  });

}
