var https = require('https');
var express = require('express');
var fs = require('fs');
var util = require('util');
var path = require('path');
var routes = require('./routes/routes');
var deploy = process.env.NODE_DEPLOY_TARGET || "local";
var config = require('./lib/nodeconfig_' + deploy);
var couchkeys = require('./lib/couchkeys_' + deploy);
var mailconfig = require('./lib/mailconfig_' + deploy);

var UserHandler = require('./lib/Users');
var FieldDBHandler = require('./lib/FieldDB');
var AppHandler = require('./lib/About');

var authenticationfunctions = require('./lib/userauthentication');
var corpus = require('./lib/corpus');

//read in the specified filenames as the security key and certificate
config.httpsOptions.key = fs.readFileSync(config.httpsOptions.key);
config.httpsOptions.cert = fs.readFileSync(config.httpsOptions.cert);

var app = express();

// configure Express
app.configure(function() {
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function() {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});
app.configure('production', function() {
  app.use(express.errorHandler());
});


var handlers = {
  users: new UserHandler({
    'authentication': authenticationfunctions,
    'corpus': corpus
  }),
  fielddb: new FieldDBHandler({
    'authentication': authenticationfunctions,
    'corpus': corpus
  }),
  app: new AppHandler({
    'config': config,
    'couchkeys': couchkeys
  })
};

routes.setup(app, handlers);
/*
 * CORS support
 * http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-nodejs
 */
var build_headers_from_request = function(req) {
  if (req.headers['access-control-request-headers']) {
    headers = req.headers['access-control-request-headers'];
  } else {
    headers = 'accept, accept-charset, accept-encoding, accept-language, authorization, content-length, content-type, host, origin, proxy-connection, referer, user-agent, x-requested-with';
    _ref = req.headers;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      header = _ref[_i];
      if (req.indexOf('x-') === 0) {
        headers += ', ' + header;
      }
    }
  }
  headers.host = "authdev.lingsync.org"; //target0.hostname;
  var cors_headers = {
    'access-control-allow-methods': 'HEAD, POST, GET, PUT, PATCH, DELETE',
    'access-control-max-age': '86400',
    'access-control-allow-headers': headers,
    'access-control-allow-credentials': 'true',
    'access-control-allow-origin': req.headers.origin || '*'
  };
  return cors_headers;
};

app.options('*', function(req, res, next) {
  if (req.method === 'OPTIONS') {
    console.log('responding to OPTIONS request');
    var cors_headers = build_headers_from_request(req);
    for (var key in cors_headers) {
      value = cors_headers[key];
      res.setHeader(key, value);
    }
    res.send(200);
  }
});


// http.createServer(app).listen(app.get('port'), function(){
//   console.log('Express server listening on port ' + app.get('port'));
// });
https.createServer(config.httpsOptions, app).listen(config.httpsOptions.port, function() {
  console.log("Express server listening on port %d", config.httpsOptions.port);
});