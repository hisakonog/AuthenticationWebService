var authenticationfunctions = require('./../lib/userauthentication.js'),
  fs = require('fs'),
  util = require('util'),
  corpus = require('./../lib/corpus');

/** 
 * These are all the old routes that haphazardly grew over time and make up API version 0.1
 * which we still have to support until all clients have switched to the new routes
 *
 * @param {[type]} app [description]
 */
var addDeprecatedRoutes = function(app, node_config) {

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
    headers.host = "authdev.lingsync.org"; //
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

  /**
   * Responds to requests for login, if sucessful replies with the user's details
   * as json
   */
  app.post('/login', function(req, res, next) {
    authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function(err, user, info) {
      var returndata = {};
      if (err) {
        res.status(err.status || 400);
        returndata.status = err.status || 400;
        console.log(new Date() + " There was an error in the authenticationfunctions.authenticateUser:\n" + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.user = user;
        delete returndata.user.password;
        delete returndata.user.serverlogs;
        returndata.info = [info.message];
        //console.log(new Date() + " Returning the existing user as json:\n" + util.inspect(user));
      }
      console.log(new Date() + " Returning response:\n" + util.inspect(returndata));
      var cors_headers = build_headers_from_request(req);
      for (var key in cors_headers) {
        value = cors_headers[key];
        res.setHeader(key, value);
      }
      res.send(returndata);
    });
  });
  app.get('/login', function(req, res, next) {
    var cors_headers = build_headers_from_request(req);
    for (var key in cors_headers) {
      value = cors_headers[key];
      res.setHeader(key, value);
    }
    res.send(); // {info: "Service is running normally."});
  });

  /**
   * Takes in the http request and response. Calls the registerNewUser function in
   * the authenticationfunctions library. The registerNewUser function takes in a
   * method (local/twitter/facebook/etc) the http request, and a function to call
   * after registerNewUer has completed. In this case the function is expected to
   * be called with an err (null if no error), user (null if no user), and an info
   * object containing a message which can be show to the calling application
   * which sent the post request.
   *
   * If there is an error, the info is added to the 'errors' attribute of the
   * returned json.
   *
   * If there is a user, the user is added to the 'user' attribute of the returned
   * json. If there is no user, the info is again added to the 'errors' attribute
   * of the returned json.
   *
   * Finally the returndata json is sent to the calling application via the
   * response.
   */
  app.post('/register', function(req, res) {

    authenticationfunctions.registerNewUser('local', req, function(err, user, info) {
      var returndata = {};
      if (err) {
        res.status(err.status || 400);
        returndata.status = err.status || 400;
        console.log(new Date() + " There was an error in the authenticationfunctions.registerNewUser" + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.user = user;
        returndata.info = [info.message];
        console.log(new Date() + " Returning the newly built user: " + util.inspect(user));
      }
      var cors_headers = build_headers_from_request(req);
      for (var key in cors_headers) {
        value = cors_headers[key];
        res.setHeader(key, value);
      }
      res.send(returndata);

    });
  });
  app.get('/register', function(req, res, next) {
    var cors_headers = build_headers_from_request(req);
    for (var key in cors_headers) {
      value = cors_headers[key];
      res.setHeader(key, value);
    }
    res.send({});
  });


  /**
   * Takes in the http request and response. Calls the setPassword function in
   * the authenticationfunctions library. The setPassword function takes in an old password,
   * new password and a username, and a function to call
   * after setPassword has completed. In this case the done function is expected to
   * be called with an err (null if no error), user (null if no user), and an info
   * object containing a message which can be show to the calling application
   * which sent the post request.
   *
   * If there is an error, the info is added to the 'errors' attribute of the
   * returned json.
   *
   * If there is a user, the user is added to the 'user' attribute of the returned
   * json. If there is no user, the info is again added to the 'errors' attribute
   * of the returned json.
   *
   * Finally the returndata json is sent to the calling application via the
   * response.
   */
  app.post('/changepassword', function(req, res) {
    var oldpassword = req.body.password;
    var newpassword = req.body.newpassword;
    var confirmpassword = req.body.confirmpassword;
    var username = req.body.username;
    res.status(401);
    if (newpassword !== confirmpassword) {
      res.send({
        status: 406,
        userFriendlyErrors: ["New passwords do not match, please try again."]
      });
      return;
    }
    authenticationfunctions.setPassword(oldpassword, newpassword, username, function(err, user, info) {
      var returndata = {};
      if (err) {
        res.status(err.status || 400);
        returndata.status = err.status || 400;
        console.log(new Date() + " There was an error in the authenticationfunctions.setPassword " + util.inspect(err));
        returndata.userFriendlyErrors = [info.message];
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.user = user;
        returndata.info = [info.message];
        res.status(200);
        console.log(new Date() + " Returning success: " + util.inspect(user));
      }
      var cors_headers = build_headers_from_request(req);
      for (var key in cors_headers) {
        value = cors_headers[key];
        res.setHeader(key, value);
      }
      res.send(returndata);

    });
  });
  app.get('/changepassword', function(req, res, next) {
    var cors_headers = build_headers_from_request(req);
    for (var key in cors_headers) {
      value = cors_headers[key];
      res.setHeader(key, value);
    }
    res.send({});
  });

  /**
   * Responds to requests for a list of team members on a corpus, if successful replies with a list of
   * usernames as json
   */
  app.post('/corpusteam', function(req, res, next) {

    var returndata = {};
    authenticationfunctions.fetchCorpusPermissions(req, function(err, users, info) {
      if (err) {
        res.status(err.status || 400);
        returndata.status = err.status || 400;
        console.log(new Date() + " There was an error in the authenticationfunctions.fetchCorpusPermissions:\n" + util.inspect(err));
        returndata.userFriendlyErrors = "Please supply a username and password to ensure this is you.";
      }
      if (!users) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.users = users;
        returndata.info = [info.message];
        // returndata.userFriendlyErrors = ["Faking an error to test"];
      }
      //console.log(new Date() + " Returning response:\n" + util.inspect(returndata));
      console.log(new Date() + " Returning the list of reader users on this corpus as json:");
      if (returndata && returndata.users) {
        console.log(util.inspect(returndata.users.readers));
      }
      var cors_headers = build_headers_from_request(req);
      for (var key in cors_headers) {
        value = cors_headers[key];
        res.setHeader(key, value);
      }
      res.send(returndata);
    });

  });
  app.get('/corpusteam', function(req, res, next) {
    var cors_headers = build_headers_from_request(req);
    for (var key in cors_headers) {
      value = cors_headers[key];
      res.setHeader(key, value);
    }
    res.send({});
  });

  /**
   * Responds to requests for adding a corpus role/permission to a user, if successful replies with the user's details
   * as json
   */
  app.post('/addroletouser', function(req, res, next) {
    authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function(err, user, info) {
      var returndata = {};
      if (err) {
        res.status(err.status || 400);
        returndata.status = err.status || 400;
        console.log(new Date() + " There was an error in the authenticationfunctions.authenticateUser:\n" + util.inspect(err));
        returndata.userFriendlyErrors = "Please supply a username and password to ensure this is you.";
        res.send(returndata);
        return;
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.roleadded = true;
        returndata.info = [info.message];

        // Add a role to the user
        authenticationfunctions.addRoleToUser(req, function(err, roles, info) {
          if (err) {
            res.status(err.status || 400);
            returndata.status = err.status || 400;
            console.log(new Date() + " There was an error in the authenticationfunctions.addRoleToUser:\n" + util.inspect(err));
            returndata.userFriendlyErrors = [info.message];
          }
          if (!roles) {
            returndata.userFriendlyErrors = [info.message];
          } else {
            returndata.roleadded = true;
            returndata.info = [info.message];
            // returndata.userFriendlyErrors = ["Faking an error"];

            console.log(new Date() + " Returning role added okay:\n");
          }
          console.log(new Date() + " Returning response:\n" + util.inspect(returndata));
          var cors_headers = build_headers_from_request(req);
          for (var key in cors_headers) {
            value = cors_headers[key];
            res.setHeader(key, value);
          }
          res.send(returndata);
        });

      }
    });
  });
  app.get('/addroletouser', function(req, res, next) {
    var cors_headers = build_headers_from_request(req);
    for (var key in cors_headers) {
      value = cors_headers[key];
      res.setHeader(key, value);
    }
    res.send({});
  });

  /**
   * Responds to requests for adding a corpus to a user, if successful replies with the pouchname of the new corpus in a string and a corpusaded = true
   */
  app.post('/newcorpus', function(req, res, next) {
    authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function(err, user, info) {
      var returndata = {};
      if (err) {
        res.status(err.status || 400);
        returndata.status = err.status || 400;
        console.log(new Date() + " There was an error in the authenticationfunctions.authenticateUser:\n" + util.inspect(err));
        returndata.userFriendlyErrors = "Please supply a username and password to ensure this is you.";
        var cors_headers = build_headers_from_request(req);
        for (var key in cors_headers) {
          value = cors_headers[key];
          res.setHeader(key, value);
        }
        res.send(returndata);
        return;
      }
      if (!user) {
        returndata.userFriendlyErrors = [info.message];
        var cors_headers = build_headers_from_request(req);
        for (var key in cors_headers) {
          value = cors_headers[key];
          res.setHeader(key, value);
        }
        res.send(returndata);
        return;
      } else {
        returndata.corpusadded = true;
        returndata.info = [info.message];

        if (!req.body.newCorpusName) {
          returndata.userFriendlyErrors = ["Corpus title was not provided."];
          var cors_headers = build_headers_from_request(req);
          for (var key in cors_headers) {
            value = cors_headers[key];
            res.setHeader(key, value);
          }
          res.send(returndata);
          return;
        }
        // Add a new corpus for the user
        corpus.createNewCorpus(req, function(err, corpus, info) {
          if (err) {
            res.status(err.status || 400);
            returndata.status = err.status || 400;
            console.log(new Date() + " There was an error in corpus.createNewCorpus");
            returndata.userFriendlyErrors = ["There was an error creating your corpus. " + req.body.newCorpusName];
          }
          if (!corpus) {
            returndata.userFriendlyErrors = ["There was an error creating your corpus. " + req.body.newCorpusName];
          } else {
            returndata.corpusadded = true;
            returndata.info = ["Corpus " + corpus.title + " created successfully."];
            returndata.corpus = corpus;
            //returndata.info = [ info.message ];
            console.log(new Date() + " Returning corpus added okay:\n");
          }
          console.log(new Date() + " Returning response:\n" + util.inspect(returndata));
          var cors_headers = build_headers_from_request(req);
          for (var key in cors_headers) {
            value = cors_headers[key];
            res.setHeader(key, value);
          }
          res.send(returndata);
        });
      }
    });
  });

  /**
     * Responds to requests for adding a user in a role to a corpus, if successful replies with corpusadded =true and an info string containgin the roles
     TODO return something useful as json
     */
  app.post('/updateroles', function(req, res, next) {
    authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function(err, user, info) {
      var returndata = {};
      if (err) {
        res.status(err.status || 400);
        returndata.status = err.status || 400;
        console.log(new Date() + " There was an error in the authenticationfunctions.authenticateUser:\n" + util.inspect(err));
        returndata.userFriendlyErrors = "Please supply a username and password to ensure this is you.";
        res.send(returndata);
        return;
      }

      if (!user) {
        returndata.userFriendlyErrors = [info.message];
      } else {
        returndata.corpusadded = true;
        returndata.info = [info.message];

        // Update user roles for corpus
        corpus.updateRoles(req, function(err, roles, info) {
          if (err) {
            res.status(err.status || 400);
            returndata.status = err.status || 400;
            console.log(new Date() + " There was an error in corpus.updateRoles\n");
            returndata.userFriendlyErrors = [info.message];
          }
          if (!roles) {
            returndata.userFriendlyErrors = ["There was an error updating the user roles."];
          } else {
            returndata.corpusadded = true;
            returndata.info = ["User roles updated successfully for " + roles];
            //  returndata.info = [ info.message ];
            console.log(new Date() + " Returning corpus role added okay:\n");
          }
          console.log(new Date() + " Returning response:\n" + util.inspect(returndata));
          var cors_headers = build_headers_from_request(req);
          for (var key in cors_headers) {
            value = cors_headers[key];
            res.setHeader(key, value);
          }
          res.send(returndata);
        });
      }
    });
  });

  // app.get('/', function(req, res, next) {
  //  var cors_headers = build_headers_from_request(req);
  //  for (var key in cors_headers) {
  //      value = cors_headers[key];
  //      res.setHeader(key, value);
  //  }
  //  res.send({
  //      info: "Service is running normally."
  //  });
  // });

  console.log("Added depcrecated routes");
};

exports.addDeprecatedRoutes = addDeprecatedRoutes;
