var couch_keys = require("./couchkeys_local");
var util = require('util'), corpus_template = require('../templates/corpus_template'), datalist_template = require('../templates/datalist_template'), session_template = require('../templates/session_template'), uuid = require('uuid');

/* variable for permissions */
var commenter = "commenter";
var collaborator = "reader";
var contributor = "writer";
var admin = "admin";

var createNewCorpus = function(dbConnection, callback) {
  dbConnection.couchConnection = this
      .getCouchConnectionFromServerCode(dbConnection.serverCode);
  dbConnection.couchConnection.pouchname = dbConnection.body.username
      + "-"
      + dbConnection.body.newCorpusName.trim().toLowerCase().replace(
          /[!@#$^&%*()+=-\[\]\/{}|:<>?,."'`; ]/g, "_");
  console.log(new Date() + " Creating new database "
      + dbConnection.couchConnection.pouchname);

  var connect = dbConnection.couchConnection.protocol + couch_keys.username
      + ":" + couch_keys.password + "@" + dbConnection.couchConnection.domain
      + ":" + dbConnection.couchConnection.port;

  var server = require('nano')(connect);

  server.db
      .create(
          dbConnection.couchConnection.pouchname,
          function(err, body) {
            if (err) {
              console.log(err);
              return callback(true, false, err);
            } 
            /*
             * Upon success of db creation, set up the collaborator, contributor
             * and admin roles for this corpus
             */
            addRoleToUserInfo(dbConnection, dbConnection.body.username, [
                dbConnection.couchConnection.pouchname + "_" + admin,
                dbConnection.couchConnection.pouchname + "_" + contributor,
                dbConnection.couchConnection.pouchname + "_" + collaborator,
                dbConnection.couchConnection.pouchname + "_" + commenter ]);

            var securityParamsforNewDB = {
              "admins" : {
                "names" : [ dbConnection.body.username ],
                "roles" : [ dbConnection.couchConnection.pouchname + "_"
                    + admin ]
              },
              "members" : {
                "names" : [],
                "roles" : [
                    dbConnection.couchConnection.pouchname + "_" + collaborator,
                    dbConnection.couchConnection.pouchname + "_" + contributor ]
              }
            };

            var newDbConnect = connect + "/"
                + dbConnection.couchConnection.pouchname;

            var db = require('nano')(newDbConnect);

            db.insert(securityParamsforNewDB, "_security", function(err, body) {
              if (!err) {
                console.log(new Date()
                    + " Added user security roles to new db.");
              } else {
                console.log(new Date() + " Did not add user security roles.");
                console.log(err);
              }
            });

            // Replicate template databases to new database
            server.db.replicate('new_corpus', newDbConnect,
                function(err, body) {
                  if (!err) {
                    console
                        .log(new Date() + " Corpus successfully replicated.");
                  } else {
                    console.log(new Date() + " Corpus replication failed.");
                  }
                });

            // Add empty docs to new database
            corpus_template.title = dbConnection.body.newCorpusName;
            corpus_template.titleAsUrl = corpus_template.title.toLowerCase()
                .replace(" ", "_");
            corpus_template.team.username = dbConnection.body.username;
            corpus_template.couchConnection = dbConnection.couchConnection;
            corpus_template.pouchname = dbConnection.couchConnection.pouchname;
            corpus_template.dateOfLastDatumModifiedToCheckForOldSession = JSON
                .parse(JSON.stringify(new Date()));
            corpus_template.confidential.secretkey = uuid.v4();
            corpus_template.publicSelf.couchConnection = corpus_template.couchConnection;
            corpus_template.publicSelf.pouchname = corpus_template.pouchname;

            datalist_template.pouchname = corpus_template.pouchname;
            datalist_template.dateCreated = JSON.parse(JSON
                .stringify(new Date()));
            datalist_template.dateModified = JSON.parse(JSON
                .stringify(new Date()));
            datalist_template.timestamp = Date.now();

            session_template.pouchname = corpus_template.pouchname;
            session_template.dateCreated = JSON.parse(JSON
                .stringify(new Date()));
            session_template.dateModified = JSON.parse(JSON
                .stringify(new Date()));
            session_template.timestamp = Date.now();

            db.insert(corpus_template, function(err, body) {
              if (!err)
                console.log(body);
            });
            db.insert(datalist_template, function(err, body) {
              if (!err)
                console.log(body);
            });
            db.insert(session_template, function(err, body) {
              if (!err)
                console.log(body);
            });

            // Replicate activity feed template to new activity feed database
            var newActivityFeedConnect = connect + "/"
                + dbConnection.couchConnection.pouchname + "-activity_feed";
            server.db
                .replicate(
                    'new_corpus_activity_feed',
                    newActivityFeedConnect,
                    {
                      create_target : true
                    },
                    function(err, body) {
                      if (!err) {
                        console.log(new Date()
                            + " Corpus activity feed successfully replicated.");
                        // Set up security on new corpus activity feed
                        var activityDb = require('nano')
                            (newActivityFeedConnect);

                        activityDb
                            .insert(
                                securityParamsforNewDB,
                                "_security",
                                function(err, body) {
                                  if (!err) {
                                    console
                                        .log(new Date()
                                            + " Added user security roles to new activity feed.");
                                  } else {
                                    console
                                        .log(new Date()
                                            + " Did not add user security roles to new activity feed.");
                                    console.log(err);
                                  }
                                });

                      } else {
                        console.log(new Date()
                            + " Corpus activity feed replication failed.");
                      }
                    });
            // TODO Add corpus created activity to activity feeds
            
            return callback(false, dbConnection.couchConnection.pouchname, {});
          });
};

module.exports.createNewCorpus = createNewCorpus;

var addRoleToUserInfo = function(dbConnection, username, roles,
    successcallback, errorcallback) {
  console.log(new Date() + " In addRoleToUser " + util.inspect(roles) + " to "
      + username + " on " + dbConnection.couchConnection.pouchname);

  var connect = dbConnection.couchConnection.protocol + couch_keys.username
      + ":" + couch_keys.password + "@" + dbConnection.couchConnection.domain
      + ":" + dbConnection.couchConnection.port + "/_users";

  var db = require('nano')(connect);
  var userid = 'org.couchdb.user:' + username, _ = require('underscore');

  db.get(userid, function(err, body) {
    if (!err) {
      var userold = body;
      console.log(new Date()
          + " These are the users's roles before adding a role."
          + util.inspect(userold.roles));

      for ( var r in roles) {
        userold.roles.push(roles[r]);
      }
      var uniqueroles = _.unique(userold.roles);
      userold.roles = uniqueroles;

      db.insert(userold, function(err, body) {
        if (!err) {
          console.log(new Date() + " User roles updated.");
        } else {
          console.log(new Date() + " User roles failed to update.");
        }
      });
    } else {
      // TODO Return well-formed error
      console.log("ERROR");
      return;
    }
  });
};

var getCouchConnectionFromServerCode = function(serverCode) {
  var couchConnection = {};
  if (serverCode == "localhost") {
    couchConnection = {
      "protocol" : "http://",
      "domain" : "localhost",
      "port" : "5984",
      "pouchname" : "firstcorpus",
      "path" : "",
      "authUrl" : "https://authdev.lingsync.org",
      "userFriendlyServerName" : "LingSync Localhost"
    };
  } else if (serverCode == "testing") {
    couchConnection = {
      protocol : "https://",
      domain : "corpusdev.lingsync.org",
      port : "443",
      pouchname : "default",
      path : "",
      authUrl : "https://authdev.lingsync.org",
      userFriendlyServerName : "LingSync Beta"
    };
  } else if (serverCode == "production") {
    couchConnection = {
      protocol : "https://",
      domain : "corpus.lingsync.org",
      port : "443",
      pouchname : "default",
      path : "",
      authUrl : "https://auth.lingsync.org",
      userFriendlyServerName : "LingSync.org"
    };
  } else if (serverCode == "mcgill") {
    couchConnection = {
      protocol : "https://",
      domain : "corpusdev.lingsync.org",
      port : "443",
      pouchname : "default",
      path : "",
      authUrl : "https://authdev.lingsync.org",
      userFriendlyServerName : "McGill ProsodyLab"
    };
  } else {
    couchConnection = {
      "protocol" : "http://",
      "domain" : "localhost",
      "port" : "5984",
      "pouchname" : "firstcorpus",
      "path" : "",
      "authUrl" : "https://authdev.lingsync.org",
      "userFriendlyServerName" : "LingSync Localhost"
    };
  }
  return couchConnection;
};

module.exports.getCouchConnectionFromServerCode = getCouchConnectionFromServerCode;