#!/usr/local/bin/node

/* Load modules provided by Node */
var https = require('https');
var FileSystem = require('fs');

/* Load modules provided by $ npm install, see package.json for details */
var CrossOriginResourceSharing = require('cors');
var ExpressWebServer = require('express');

/* Load modules provided by this codebase */
var AuthWebServiceRoutes = require('./routes/routes');

/** 
 * You can control aspects of the deployment by using Environment Variables
 *
 * Examples:
 * $ NODE_DEPLOY_TARGET=production        # uses lib/nodeconfig_production.js
 * $ NODE_DEPLOY_TARGET=devserver         # uses lib/nodeconfig_devserver.js
 * $ NODE_DEPLOY_TARGET=local             # uses lib/nodeconfig_local.js
 * $ NODE_DEPLOY_TARGET=yoursecretconfig  # uses lib/nodeconfig_yoursecretconfig.js
 */
var deploy_target = process.env.NODE_DEPLOY_TARGET || "local";
var config = require('./lib/nodeconfig_' + deploy_target);

/**
 * Use Express to create the AuthWebService see http://expressjs.com/ for more details
 */
var AuthWebService = ExpressWebServer();
AuthWebService.configure(function() {
  AuthWebService.use(ExpressWebServer.logger());
  AuthWebService.use(ExpressWebServer.cookieParser());
  AuthWebService.use(ExpressWebServer.bodyParser());
  AuthWebService.use(ExpressWebServer.methodOverride());
  AuthWebService.use(CrossOriginResourceSharing());
  AuthWebService.use(AuthWebService.router);
  /*
   * Although this is mostly a webservice used by machines (not a websserver used by humans)
   * we are still serving a user interface for the api sandbox in the public folder
   */
  AuthWebService.use(ExpressWebServer.static(__dirname + '/public'));
});

AuthWebService.configure('development', function() {
  AuthWebService.use(ExpressWebServer.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

AuthWebService.configure('production', function() {
  AuthWebService.use(ExpressWebServer.errorHandler());
});

/**
 * Set up all the available URL AuthWebServiceRoutes see routes/routes.js for more details
 */
AuthWebServiceRoutes.setup(AuthWebService);


/**
 * Read in the specified filenames for this config's security key and certificates,
 * and then ask https to turn on the webservice
 */
config.httpsOptions.key = FileSystem.readFileSync(config.httpsOptions.key);
config.httpsOptions.cert = FileSystem.readFileSync(config.httpsOptions.cert);

https.createServer(config.httpsOptions, AuthWebService).listen(config.httpsOptions.port, function() {
  console.log("Listening on port %d", config.httpsOptions.port);
});
