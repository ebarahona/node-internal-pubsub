/**
 * This is an example SockJS server based on:
 * https://github.com/sockjs/sockjs-node/tree/master/examples/express-3.x
 */

var app     = require('express')();
var http    = require('http');
var sockjs  = require('sockjs');
var redis   = require('redis');
var pubsub  = require('node-internal-pubsub');

// Create redis client, subscriber and internal publisher
var redisClient = redis.createClient();
var redisSub = redis.createClient();
var pub = pubsub.createPublisher();

// Subscribe to all incoming messages, and publish them to the internal pubsub
redisSub.psubscribe('*');
redisSub.on('pmessage', function(pattern, channel, msg) {
  pub.publish(channel, msg);
});

// Setup express
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

// SockJS server
var options = {sockjs_url: 'http://cdn.sockjs.org/sockjs-0.3.min.js'};
var wsServer = sockjs.createServer(options);

wsServer.on('connection', function(conn) {
  var sub = pubsub.createSubscriber();
  sub.subscribe('chatmessages');

  // Send incoming messages to the user
  sub.on('message', function(channel, message) {
    conn.write(message);
  });

  // Publish messages received from the user to redis
  conn.on('data', function(message) {
    redisClient.publish('chatmessages', message);
  });
});

// Create http server for use with express and SockJS
var server = http.createServer(app);
wsServer.installHandlers(server, {prefix: '/chat'});

console.log(' [*] Listening on 0.0.0.0:8001' );
server.listen(8001, '0.0.0.0');
