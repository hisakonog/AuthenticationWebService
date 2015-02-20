var deploy_target = process.env.NODE_DEPLOY_TARGET || "local";
var util = require('util'),
  url = require('url'),
  bcrypt = require('bcrypt'),
  node_config = require("./nodeconfig_" + deploy_target),
  couch_keys = require("./couchkeys_" + deploy_target),
  mail_config = require("./mailconfig_" + deploy_target),
  nodemailer = require("nodemailer"),
  _ = require('underscore'),
  md5 = require('MD5'),
  corpus_management = require('./corpusmanagement'),
  uuid = require('uuid'),
  corpus = require('./corpus');

/* variable for permissions */
var collaborator = "reader";
var contributor = "writer";
var admin = "admin";
var commenter = "commenter";

/*
 * we are getting too many user signups from the Learn X users and the speech recognition trainer users,
 * they are starting to overpower the field linguist users. So if when we add the ability for them
 * to backup and share their languages lessions, then
 * we will create their dbs  with a non-anonymous username.
 */
var dontCreateDBsForLearnXUsersBecauseThereAreTooManyOfThem = true;


var authServerVersion = "2.12.0";

//Only create users on the same server.
var parsed = url.parse("http://localhost:5984");
var couchConnectUrl = parsed.protocol + "//" + couch_keys.username + ":" + couch_keys.password + "@" + parsed.host;

console.log(new Date() + " Loading the User Authentication Module");
var nano = require('nano')(couchConnectUrl);

//Send email see docs https://github.com/andris9/Nodemailer
var smtpTransport = nodemailer.createTransport("SMTP", mail_config.mailConnection);
var mailOptions = mail_config.newUserMailOptions();
var emailWhenServerStarts = mailOptions.to;
if (emailWhenServerStarts !== "") {
  mailOptions.subject = "FieldDB server restarted";
  mailOptions.text = "The FieldDB server has restarted. (It might have crashed)";
  mailOptions.html = "The FieldDB server has restarted. (It might have crashed)";
  smtpTransport.sendMail(mailOptions, function(error, response) {
    if (error) {
      console.log(new Date() + " Server (re)started Mail error" + util.inspect(error));
    } else {
      console.log(new Date() + " Server (re)started, message sent: \n" + response.message);
    }
    smtpTransport.close(); // shut down the connection pool, no more messages
  });
} else {
  console.log(new Date() + " Didn't email the devs: The FieldDB server has restarted. (It might have crashed)");
}

/*
 * User Authentication functions
 */
module.exports = {};

/**
 * Takes parameters from the request and creates a new user json, salts and
 * hashes the password, has the corpus_management library create a new couchdb
 * user, permissions and couches for the new user. The returns the save of the
 * user to the users database.
 */
module.exports.registerNewUser = function(localOrNot, req, done) {
  if (req.body.username == "yourusernamegoeshere") {
    return done({
      status: 412,
      error: 'Username is the default username'
    }, null, {
      message: 'Please type a username instead of yourusernamegoeshere.'
    });
  }

  if (!req || !req.body.username || !req.body.username) {
    return done({
      status: 412,
      error: 'Please provide a username'
    }, null, {
      message: 'Please provide a username'
    });
  }

  if (req.body.username.length < 3) {
    return done({
      status: 412,
      error: 'Please provide a longer username'
    }, null, {
      message: 'Please provide a longer username'
    });
  }

  var safeUsernameForCouchDB = req.body.username.trim().toLowerCase().replace(/[^0-9a-z]/g, "");
  if (req.body.username !== safeUsernameForCouchDB) {
    return done({
      status: 406,
      error: 'The username :' + req.body.username + ': was not a safe username user, requested the user to change it to: ' + safeUsernameForCouchDB
    }, null, {
      message: 'Please use \'' + safeUsernameForCouchDB + '\' instead (the username you have chosen isn\'t very safe for urls, which means your corpora would be potentially inaccessible in old browsers)'
    });
  }

  // Make sure the username doesn't exist.
  findByUsername(req.body.username, function(err, user, info) {
    if (user) {
      return done(err, null, {
        message: 'Username already exists, try a different username.'
      });
    } else {
      console.log(new Date() + ' Registering new user: ' + req.body.username);
      req.body.email = req.body.email ? req.body.email.toLowerCase().trim() : null;
      var salt = bcrypt.genSaltSync(10);
      /*
       * Add more attributes from the req.body below
       */

      // Create couchConnection and activityCouchConnection based on server
      // code in request TODO what does serverCode look like or mean? maybe too ambiguous?
      var serverCode = req.body.serverCode;
      //TODO this has to be come asynchonous if this design is a central server who can register users on other servers
      var couchConnection = corpus.getCouchConnectionFromServerCode(serverCode);
      couchConnection.pouchname = req.body.username + "-firstcorpus";
      if (serverCode === "phophlo") {
        couchConnection.pouchname = req.body.username + "-phophlo";
      }
      if (serverCode === "kartulispeechrecognition") {
        couchConnection.pouchname = req.body.username + "-kartuli";
      }
      if (serverCode === "georgiantogether") {
        couchConnection.pouchname = req.body.username + "-georgian";
      }
      var activityCouchConnection = JSON.parse(JSON.stringify(couchConnection));
      activityCouchConnection.pouchname = req.body.username + "-activity_feed";

      var corpuses = [JSON.parse(JSON.stringify(couchConnection))];

      /* Prepare mostRecentIds so apps can load a most recent dashboard if applicable */
      var mostRecentIds = {};
      mostRecentIds.couchConnection = JSON.parse(JSON.stringify(couchConnection));

      /* Set gravatar using the user's registered email, or username if none */
      var gravatar = null;
      if (req.body.email) {
        gravatar = md5(req.body.email);
      }
      if (!gravatar) {
        gravatar = md5(req.body.username);
      }
      req.body.email = req.body.email || "";

      /* Prepare a private corpus doc for the user's first corpus */
      var corpusTitle = "Practice Corpus";
      if (serverCode === "phophlo") {
        corpusTitle = "Phophlo";
      }
      if (serverCode === "georgiantogether") {
        corpusTitle = "Geogian";
      }
      if (serverCode === "kartulispeechrecognition") {
        corpusTitle = "Kartuli Speech Recognition";
      }
      var private_corpus_template = corpus.createPrivateCorpusDoc(req.body.username, corpusTitle, couchConnection, couchConnection.pouchname);
      if (serverCode === "phophlo") {
        private_corpus_template.description = "This is your Phophlo database, here you can see your imported class lists and participants results. You can share your database with others by adding them to your team as readers, writers, commenters or admins on your database.";
      }
      if (serverCode === "georgiantogether") {
        private_corpus_template.description = "This is your Georgian database, here you can see the lessons you made for your self. You can share your database with others by adding them to your team as readers, writers, commenters or admins on your database.";
      }
      if (serverCode === "kartulispeechrecognition") {
        private_corpus_template.description = "This is your personal database, here you can see the sentences you made for your own speech recognition system trained to your voice and vocabulary. You can share your database with others by adding them to your team as readers, writers, commenters or admins on your database.";
      }

      /* Prepare a public corpus doc for the user's first corpus */
      var public_corpus_template = corpus.createPublicCorpusDoc(couchConnection, couchConnection.pouchname);

      /* Prepare an empty datalist doc for the user's first corpus */
      var datalist_template = corpus.createDatalistDoc(couchConnection.pouchname);

      /* Prepare an empty session doc for the user's first corpus */
      var session_template = corpus.createSessionDoc(couchConnection.pouchname);

      var defaultPrefs = {
        "skin": "user/skins/weaving.jpg",
        "numVisibleDatum": 2,
        "transparentDashboard": "false",
        "alwaysRandomizeSkin": "true",
        "numberOfItemsInPaginatedViews": 10,
        "unicodes": [{
          "symbol": "ɔ",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "ə",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "ɛ",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "ɣ",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "ɥ",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "ɦ",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "ɫ",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "ʃ",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "ʒ",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "ʔ",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "λ ",
          "tipa": "lambda",
          "useCount": 0
        }, {
          "symbol": "α ",
          "tipa": "alpha",
          "useCount": 0
        }, {
          "symbol": "β ",
          "tipa": "\beta",
          "useCount": 0
        }, {
          "symbol": "∀",
          "tipa": "\forall",
          "useCount": 0
        }, {
          "symbol": "∃",
          "tipa": "exists",
          "useCount": 0
        }, {
          "symbol": "°",
          "tipa": "^{circ}",
          "useCount": 0
        }, {
          "symbol": "∄",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "∅",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "∈",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "∉",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "∋",
          "tipa": "",
          "useCount": 0
        }, {
          "symbol": "∌",
          "tipa": "",
          "useCount": 0
        }]
      };

      user = {
        "jsonType": 'user',
        "username": req.body.username,
        "_id": req.body.username,
        "email": req.body.email,
        "corpuses": corpuses,
        "activityCouchConnection": activityCouchConnection,
        "appbrand": serverCode || "lingsync",

        "gravatar": gravatar,
        "researchInterest": req.body.researchInterest || "",
        "affiliation": req.body.affiliation || "",
        "appVersionWhenCreated": req.body.appVersionWhenCreated || "unknown",
        "authServerVersionWhenCreated": authServerVersion,
        "authUrl": couchConnection.authUrl,
        // authUrl : req.body.authUrl,
        "description": req.body.description || "",
        "subtitle": req.body.subtitle || "",
        "dataLists": req.body.dataLists || [],
        "prefs": req.body.prefs || defaultPrefs,
        "mostRecentIds": mostRecentIds || {},
        "firstname": req.body.firstname || "",
        "lastname": req.body.lastname || "",
        "sessionHistory": req.body.sessionHistory || [],
        "hotkeys": req.body.hotkeys || {},

        "salt": salt,
        "hash": bcrypt.hashSync(req.body.password, salt),
        "created_at": new Date(),
        "updated_at": new Date()
      };
      var team = {
        "_id": "team",
        "gravatar": user.gravatar,
        "username": user.username,
        "collection": "users",
        "firstname": "",
        "lastname": "",
        "subtitle": "",
        "email": "",
        "researchInterest": "No public information available",
        "affiliation": "No public information available",
        "description": "No public information available"
      };
      var usersPublicSelfForThisCorpus = {
        "_id": user._id,
        "gravatar": user.gravatar,
        "username": user.username,
        "appbrand": serverCode || "lingsync",
        "collection": "users",
        "firstname": "",
        "lastname": "",
        "email": "",
        "researchInterest": "No public information available",
        "affiliation": "No public information available",
        "description": "No public information available"
      };
      /*
       * Create the databases for the new user's corpus
       */
      var userforcouchdb = {
        "username": req.body.username,
        "password": req.body.password,
        "corpuses": [JSON.parse(JSON.stringify(couchConnection))],
        "activityCouchConnection": activityCouchConnection
      };

      var docsNeededForAProperFieldDBDatabase = [team, usersPublicSelfForThisCorpus, public_corpus_template, private_corpus_template, datalist_template, session_template];

      if (dontCreateDBsForLearnXUsersBecauseThereAreTooManyOfThem &&
        (couchConnection.pouchname.indexOf("anonymouskartulispeechrecognition") > -1 ||
          couchConnection.pouchname.indexOf(/anonymous[0-9]/) > -1)) {
        console.log(new Date() + "  delaying creation of the dbs for " + couchConnection.pouchname + " and " + activityCouchConnection.pouchname + " until they can actually use them.");

        emailWelcomeToTheUser(user);
        /*
         * The user was built correctly, saves the new user into the users database
         */
        console.log(new Date() + " Sent command to save user to couch: " + util.inspect(node_config.usersDbConnection));
        return saveUpdateUserToDatabase(user, done);
      }

      corpus_management.createDbaddUser(userforcouchdb.corpuses[0], userforcouchdb, function(res) {
        console.log(new Date() + " There was success in creating the corpus: " + util.inspect(res) + "\n");

        /* Save corpus, datalist and session docs so that apps can load the dashboard for the user */
        var db = require('nano')(couchConnectUrl + "/" + private_corpus_template.pouchname);
        db.bulk({
          "docs": docsNeededForAProperFieldDBDatabase
        }, function(err, body) {
          if (err) {
            console.log(new Date() + " There was an error in creating the docs for the users first corpus: " + util.inspect(err) + "\n");
            undoCorpusCreation(user, private_corpus_template.couchConnection, docsNeededForAProperFieldDBDatabase);
            err = err || {};
            err.status = err.status || 500;
            return done(err, null, {
              message: 'Server is not responding for request to create user `' + user.username + '`. Please report this.'
            });
          } else {
            console.log(new Date() + " Created corpus for " + private_corpus_template.pouchname + "\n");

            emailWelcomeToTheUser(user);
            /*
             * The user was built correctly, saves the new user into the users database
             */
            console.log(new Date() + " Sent command to save user to couch: " + util.inspect(node_config.usersDbConnection));
            return saveUpdateUserToDatabase(user, done);
          }
        });


      }, function(err) {
        console.log(new Date() + " There was an error in creating the corpus database: " + util.inspect(err) + "\n");
        undoCorpusCreation(user, private_corpus_template.couchConnection, docsNeededForAProperFieldDBDatabase);

        err = err || {};
        err.status = err.status || 500;
        return done(err, null, {
          message: 'Server is not responding for request to create user, `' + user.username + '`. Please report this.'
        });

      });
      console.log(new Date() + " Sent command to create user's corpus to couch: " + util.inspect(user.corpuses[user.corpuses.length - 1]));

    }
  });
};

var emailWelcomeToTheUser = function(user) {
  /* all is well, the corpus was created. welcome the user */
  if (!user.email) {
    user.email = "bounce@lingsync.org";
  }
  if (user.email && user.email.length > 5 && mail_config.mailConnection.auth.user !== "") {
    // Send email https://github.com/andris9/Nodemailer
    var smtpTransport = nodemailer.createTransport("SMTP", mail_config.mailConnection);
    var mailOptions = mail_config.newUserMailOptions();
    if (user.appbrand === "phophlo") {
      mailOptions = mail_config.newUserMailOptionsPhophlo();
    }
    mailOptions.to = user.email + "," + mailOptions.to;
    mailOptions.text = mailOptions.text.replace(/insert_username/g, user.username);
    mailOptions.html = mailOptions.html.replace(/insert_username/g, user.username);
    smtpTransport.sendMail(mailOptions, function(error, response) {
      if (error) {
        console.log(new Date() + " Mail error" + util.inspect(error));
      } else {
        console.log(new Date() + " Message sent: \n" + response.message);
        console.log(new Date() + " Sent User " + user.username + " a welcome email at " + user.email);
      }
      smtpTransport.close(); // shut down the connection pool
    });
  } else {
    console.log(new Date() + " Didn't email welcome to new user" + user.username + " why: emailpresent: " + user.email + ", valid user email: " + (user.email.length > 5) + ", mailconfig: " + (mail_config.mailConnection.auth.user !== ""));
  }

};

var undoCorpusCreation = function(user, couchConnection, docs) {
  console.log(new Date() + " TODO need to clean up a broken corpus." + util.inspect(couchConnection));
  if (!user.email) {
    user.email = "bounce@lingsync.org";
  }
  /* Something is wrong with the user's app, for now, notify the user */
  if (user.email && user.email.length > 5 && mail_config.mailConnection.auth.user !== "") {
    var smtpTransport = nodemailer.createTransport("SMTP", mail_config.mailConnection);
    var mailOptions = mail_config.newUserMailOptions();
    if (user.appbrand === "phophlo") {
      mailOptions = mail_config.newUserMailOptionsPhophlo();
    }
    mailOptions.to = user.email + "," + mailOptions.to;
    mailOptions.text = "There was a problem while registering your user. The server admins have been notified." + user.username;
    mailOptions.html = "There was a problem while registering your user. The server admins have been notified." + user.username;
    smtpTransport.sendMail(mailOptions, function(error, response) {
      if (error) {
        console.log(new Date() + " Mail error" + util.inspect(error));
      } else {
        console.log(new Date() + " Message sent: \n" + response.message);
        console.log(new Date() + " Sent User " + user.username + " a welcome email at " + user.email);
      }
      smtpTransport.close(); // shut down the connection pool
    });
  } else {
    console.log(new Date() + " Didnt email welcome to new user" + user.username + " why: emailpresent: " + user.email + ", valid user email: " + (user.email.length > 5) + ", mailconfig: " + (mail_config.mailConnection.auth.user !== ""));
  }

};

/*
 * Looks up the user by username, gets the user, confirms this is the right
 * password. Takes user details from the request and saves them into the user,
 * then calls done with (error, user, info)
 *
 * If its not the right password does some logging to find out how many times
 * they have attempted, if its too many it emails them a temp password if they
 * have given us a valid email. If this is a local or dev server config, it
 * doesn't email, or change their password.
 */
module.exports.authenticateUser = function(username, password, req, done) {
  if (!username) {
    return done({
      status: 412,
      error: 'Username was not specified. ' + username
    }, null, {
      message: 'Please supply a username.'
    });
  }

  if (!password) {
    return done({
      status: 412,
      error: 'Password was not specified. ' + password
    }, null, {
      message: 'Please supply a password.'
    });
  }


  var safeUsernameForCouchDB = username.trim().toLowerCase().replace(/[^0-9a-z]/g, "");
  if (username !== safeUsernameForCouchDB) {
    return done({
      status: 406,
      error: 'The username ' + username + ' was not a real user, and potentially trying to do somethign dangerous. ' + safeUsernameForCouchDB
    }, null, {
      message: 'Username or password is invalid. Maybe your username is ' + safeUsernameForCouchDB + '?'
    });
  }

  findByUsername(username, function(err, user, info) {
    if (err) {
      return done(err, null, info);
    }
    if (!user) {
      // This case is a server error, it should not happen.
      return done({
        status: 500,
      }, false, {
        message: 'Server is not responding for request. Please report this 1292'
      });
    }
    verifyPassword(password, user, function(err, passwordCorrect) {
      if (err) {
        return done(err, null, {
          message: 'Server is not responding for request. Please report this 1293'
        });
      }
      if (!passwordCorrect) {
        console.log(new Date() + ' User found, but they have entered the wrong password ' + username);
        /*
         * Log this unsucessful password attempt
         */
        user.serverlogs = user.serverlogs || {};
        user.serverlogs.incorrectPasswordAttempts = user.serverlogs.incorrectPasswordAttempts || [];
        user.serverlogs.incorrectPasswordAttempts.push(new Date());
        user.serverlogs.incorrectPasswordEmailSentCount = user.serverlogs.incorrectPasswordEmailSentCount || 0;
        var incorrectPasswordAttemptsCount = user.serverlogs.incorrectPasswordAttempts.length;
        var timeToSendAnEmailEveryXattempts = incorrectPasswordAttemptsCount >= 5;
        /* Dont reset the public user or lingllama's passwords */
        if (username == "public" || username == "lingllama") {
          timeToSendAnEmailEveryXattempts = false;
        }
        if (timeToSendAnEmailEveryXattempts) {

          console.log(new Date() + ' User ' + username + ' found, but they have entered the wrong password ' + incorrectPasswordAttemptsCount + ' times. ');
          /*
           * This emails the user, if the user has an email, if the
           * email is 'valid' TODO do better email validation. and if
           * the mail_config has a valid user. For the dev and local
           * versions of the app, this wil never be fired because the
           * mail_config doesnt have a valid user. But the production
           * config does, and it is working.
           */
          if (user.email && user.email.length > 5 && mail_config.mailConnection.auth.user != "") {
            var newpassword = makeRandomPassword();
            var smtpTransport = nodemailer.createTransport("SMTP", mail_config.mailConnection);
            var mailOptions = mail_config.suspendedUserMailOptions();
            if (user.appbrand === "phophlo") {
              mailOptions = mail_config.suspendedUserMailOptionsPhophlo();
            }
            mailOptions.to = user.email + "," + mailOptions.to;
            mailOptions.text = mailOptions.text.replace(/insert_temporary_password/g, newpassword);
            mailOptions.html = mailOptions.html.replace(/insert_temporary_password/g, newpassword);
            smtpTransport.sendMail(mailOptions, function(error, response) {
              if (error) {
                console.log(new Date() + " Mail error" + util.inspect(error));
                saveUpdateUserToDatabase(user, function() {
                  console.log(new Date() + " Server logs updated in user.");
                });
              } else {
                console.log(new Date() + " Message sent: \n" + response.message);
                user.serverlogs.incorrectPasswordEmailSentCount++;

                user.serverlogs.oldIncorrectPasswordAttempts = user.serverlogs.oldIncorrectPasswordAttempts || [];
                user.serverlogs.oldIncorrectPasswordAttempts = user.serverlogs.oldIncorrectPasswordAttempts.concat(user.serverlogs.incorrectPasswordAttempts);
                user.serverlogs.incorrectPasswordAttempts = [];

                var salt = user.salt = bcrypt.genSaltSync(10);
                user.hash = bcrypt.hashSync(newpassword, salt);
                saveUpdateUserToDatabase(user, function() {
                  console.log(new Date() + " Attempted to reset User " + user.username + " password to a temp password.");
                });
                // save new password to couch too
                corpus_management.changeUsersPassword(
                  user.corpuses[user.corpuses.length - 1],
                  user,
                  newpassword,
                  function(res) {
                    console.log(new Date() + " There was success in creating changing the couchdb password: " + util.inspect(res) + "\n");
                  },
                  function(err) {
                    console.log(new Date() + " There was an error in creating changing the couchdb password " + util.inspect(err) + "\n");
                  });
              }
              smtpTransport.close();
            });
            return done({
                status: 401,
                error: "Triggered an email with a temp password"
              },
              null, {
                message: 'You have tried to log in too many times. We are sending a temporary password to your email.'
              });
          } else {
            saveUpdateUserToDatabase(user,
              function() {
                console.log(new Date() + " Server logs updated in user.");
              });
            console.log(new Date() + 'User didn\'t not provide a valid email, so their temporary password was not sent by email.');
            return done({
                status: 401,
                error: "Triggered an email with a temp password"
              },
              null, {
                message: 'You have tried to log in too many times and you dont seem to have a valid email so we cant send you a temporary password.'
              });
          }

        } else {
          saveUpdateUserToDatabase(user, function() {
            console.log(new Date() + " Server logs updated in user.");
          });
          // Don't tell them its because the password is wrong.
          console.log(new Date() + " Returning: Username or password is invalid. Please try again.");

          return done({
              status: 401,
              error: "Invalid password"
            },
            null, {
              message: 'Username or password is invalid. Please try again.'
            });
        }
      }
      console.log(new Date() + ' User found, and password verified ' + username);

      /*
       * Save the users' updated details, and return to caller TODO Add
       * more attributes from the req.body below
       */
      if (req.body.syncDetails == "true") {
        console.log(new Date() + " Here is syncUserDetails: " + util.inspect(req.body.syncUserDetails));

        if (JSON.stringify(user.corpuses) != JSON.stringify(req.body.syncUserDetails.corpuses)) {
          console.log(new Date() + " It looks like the user has created some new local offline corpora. Attempting to make new corpus on the team server so the user can download them.");
          var userforcouchdb = {
            username: req.body.username,
            password: req.body.password,
            corpuses: req.body.syncUserDetails.corpuses,
            activityCouchConnection: req.body.activityCouchConnection
          };
          createNewCorpusesIfDontExist(user, userforcouchdb,
            req.body.syncUserDetails.corpuses);

        } else {
          console.log(new Date() + " User's corpuses are unchanged.");
        }
        /* Users details which can come from a client side must be added here, otherwise they are not saved on sync. */
        user.corpuses = req.body.syncUserDetails.corpuses;
        user.email = req.body.syncUserDetails.email;
        user.gravatar = req.body.syncUserDetails.gravatar;
        user.researchInterest = req.body.syncUserDetails.researchInterest;
        user.affiliation = req.body.syncUserDetails.affiliation;
        user.appVersionWhenCreated = req.body.syncUserDetails.appVersionWhenCreated;
        user.authUrl = req.body.syncUserDetails.authUrl;
        user.description = req.body.syncUserDetails.description;
        user.subtitle = req.body.syncUserDetails.subtitle;
        user.dataLists = req.body.syncUserDetails.dataLists;
        user.prefs = req.body.syncUserDetails.prefs;
        user.mostRecentIds = req.body.syncUserDetails.mostRecentIds;
        user.firstname = req.body.syncUserDetails.firstname;
        user.lastname = req.body.syncUserDetails.lastname;
        user.sessionHistory = req.body.syncUserDetails.sessionHistory;
        user.hotkeys = req.body.syncUserDetails.hotkeys;
      }

      user.updated_at = new Date();
      user.serverlogs = user.serverlogs || {};
      user.serverlogs.successfulLogins = user.serverlogs.successfulLogins || [];
      user.serverlogs.successfulLogins.push(new Date());
      if (user.serverlogs.incorrectPasswordAttempts && user.serverlogs.incorrectPasswordAttempts.length > 0) {
        user.serverlogs.oldIncorrectPasswordAttempts = user.serverlogs.oldIncorrectPasswordAttempts || [];
        user.serverlogs.oldIncorrectPasswordAttempts = user.serverlogs.oldIncorrectPasswordAttempts.concat(user.serverlogs.incorrectPasswordAttempts);
        user.serverlogs.incorrectPasswordAttempts = [];
      }
      return saveUpdateUserToDatabase(user, done);

    });

  });
};

/*
 * Ensures the requesting user to make the permissions
 * modificaitons. Then adds the role to the user if they exist
 */
module.exports.addRoleToUser = function(req, done) {
  var requestingUser = req.body.username;
  var dbConn = {};
  // If serverCode is present, request is coming from Spreadsheet app
  if (req.body.serverCode) {
    dbConn = corpus.getCouchConnectionFromServerCode(req.body.serverCode);
    dbConn.pouchname = req.body.pouchname;
  } else {
    dbConn = req.body.couchConnection;
  }

  if (!req || !req.body.username || !req.body.username) {
    return done({
      status: 412,
      error: 'Please provide a username'
    }, null, {
      message: 'Please provide a username'
    });
  }

  corpus.isRequestingUserAnAdminOnCorpus(req, requestingUser, dbConn, function(error, result, messages) {
    if (error) {
      return done(error, result, messages);
    } else {
      console.log(new Date() + " User " + requestingUser + " is admin and can modify permissions on " + dbConn.pouchname);

      var rolesSimpleStrings = req.body.roles;
      if (!rolesSimpleStrings) {
        return done({
          error: "Client didnt define the roles to add."
        }, null, {
          message: "There was a problem adding user to this corpus."
        });
      }
      var roles = [];
      for (var r in rolesSimpleStrings) {
        roles.push(dbConn.pouchname + "_" + rolesSimpleStrings[r]);
      }

      /*
       * If they are admin, add the role to the user, then add the corpus to user if succesfull
       */
      var doneAddRoleToUser = done;
      return corpus_management.addRoleToUser(dbConn, req.body.userToAddToRole, roles, function(error, result, info) {
        addCorpusToUser(error, req.body.userToAddToRole, dbConn, result, doneAddRoleToUser);
      }, doneAddRoleToUser);


    }
  });
};

/*
 * Looks returns a list of users ordered by role in that corpus
 */
module.exports.fetchCorpusPermissions = function(req, done) {
  var dbConn;

  // If serverCode is present, request is coming from Spreadsheet app
  if (req.body.serverCode) {
    dbConn = corpus.getCouchConnectionFromServerCode(req.body.serverCode);
    dbConn.pouchname = req.body.pouchname;
  } else {
    dbConn = req.body.couchConnection;
  }

  if (!req || !req.body.username || !req.body.username) {
    return done({
      status: 412,
      error: 'Please provide a username'
    }, null, {
      message: 'Please provide a username'
    });
  }

  if (!dbConn) {
    return done({
      status: 412,
      error: "Client didn't define the database connection."
    }, null, {
      message: "This app has made an invalid request. Please notify its developer. missing: serverCode or couchConnection"
    });
  }

  var pouchname = dbConn.pouchname;
  var requestingUser = req.body.username;
  var requestingUserIsAMemberOfCorpusTeam = false;

  if (dbConn.domain.indexOf("iriscouch") > -1) {
    dbConn.port = "6984";
  }
  console.log(new Date() + " Looking for corpus permissions on localhost: ");
  var nanoforpermissions = require('nano')(couchConnectUrl);

  /*
   * Get user names and roles from the server
   *
   * https://127.0.0.1:6984/_users/_design/users/_view/userroles
   */
  var usersdb = nanoforpermissions.db.use("_users");
  usersdb.view("users", "userroles", function(error, body) {
    if (error) {
      console.log(new Date() + " Error quering users: " + util.inspect(error));
      console.log(new Date() + " This is the results recieved: " + util.inspect(body));
      error = error || {};
      error.status = error.status || 500;
      return done(error, null, {
        message: 'Server is not responding for request to query corpus permissions. Please report this 1289'
      });
    } else {
      var userroles = body.rows;
      /*
       * Get user masks from the server
       */
      var usersdb = nanoforpermissions.db.use(node_config.usersDbConnection.dbname);
      // Put the user in the database and callback
      usersdb.view("users", "usermasks", function(error, body) {
        if (error) {
          console.log(new Date() + " Error quering users: " + util.inspect(error));
          console.log(new Date() + " This is the results recieved: " + util.inspect(body));
          error = error || {};
          error.status = error.status || 500;
          return done(error, null, {
            message: 'Server is not responding for request to quering corpus permissions. Please report this 1288'
          });
        } else {
          var usermasks = body.rows;

          var rolesAndUsers = {};
          rolesAndUsers.notonteam = [];
          rolesAndUsers.allusers = [];

          userroles.forEach(function(doc) {
            var currentUsername = doc.key;
            //console.log(new Date() + " Looking at " + currentUsername);
            var userIsOnTeam = false;

            /* Get the mask for this user */
            var thisUsersMask = {};
            usermasks.forEach(function(usermask) {
              if (usermask.key == currentUsername) {
                thisUsersMask = usermask.value;
                thisUsersMask.gravatar = md5(thisUsersMask.gravatar_email);
                delete thisUsersMask.gravatar_email;
                rolesAndUsers.allusers.push(usermask.value);
              }
            });

            /* Go through all the user's roles */
            var roles = doc.value;
            roles.forEach(function(role) {

              /* Check to see if this role is for this corpus */
              if (role.indexOf(pouchname) > -1) {
                //console.log(new Date() + " This role is for this corpus: " + role);
                requestingUserIsAMemberOfCorpusTeam = true;
                /*
                 * If the role is for this corpus, insert the users's mask into
                 * the relevant roles, this permits the creation of new roles in the system
                 */
                var roleType = role.replace(pouchname + "_", "") + "s";
                rolesAndUsers[roleType] = rolesAndUsers[roleType] || [];
                rolesAndUsers[roleType].push(thisUsersMask);
              }
            });

            if (!userIsOnTeam) {
              rolesAndUsers.notonteam.push(thisUsersMask);
            }

          });

          /*
           * Send the results, if the user is part of the team
           */
          if (requestingUserIsAMemberOfCorpusTeam) {
            done(null, rolesAndUsers, {
              message: "Look up successful."
            });
          } else {
            done({
              status: 401,
              error: "Requesting user is not a member of the corpus team."
            }, null, {
              message: "Unauthorized, you are not a member of this corpus team."
            });
          }

        }
      });

    }
  });

};

var addCorpusToUser = function(error, username, newcorpusConnection, rolesresult, done) {
  if (error) {
    return done(error, null, {
      message: "There was a problem adding user to this corpus."
    });
  }
  findByUsername(username, function(err, user, info) {
    if (err) {
      // Don't tell them its because the user doesn't exist.
      return done(err, null, {
        message: 'Username doesnt exist on this server. This is a bug.'
      });
    }
    if (!user) {
      // This case is a server error, it should not happen.
      return done(null, false, {
        message: 'Server error. 1292'
      });
    }

    /*
     * If corpus is already there
     */
    console.log(new Date() + " Here are the user's known corpora" + util.inspect(user.corpuses));
    var indexOfNewCorpusInExistingCorpuses = _.pluck(user.corpuses, "pouchname").indexOf(newcorpusConnection.pouchname);
    if (indexOfNewCorpusInExistingCorpuses > -1) {
      return done(
        null,
        rolesresult, {
          message: 'Added role(s) to user, the user is already a member of this corpus team.'
        });
    }

    /*
     * Add the new db connection to the user, save them and send them an
     * email telling them they they have access
     */
    user.newCorpusConnections = user.newCorpusConnections || [];
    user.newCorpusConnections.push(newcorpusConnection);

    var doneAddingCorpusToUser = done;
    saveUpdateUserToDatabase(user, function(error, user, info) {
      if (error) {
        return doneAddingCorpusToUser(
          error,
          rolesresult, {
            message: "Added role(s) to " + username + " but we weren't able to add this corpus to their account. This is most likely a bug, please report it."
          });
      }
      // send the user an email to welcome to this corpus team
      if (user.email && user.email.length > 5 && mail_config.mailConnection.auth.user !== "") {
        var smtpTransport = nodemailer.createTransport("SMTP", mail_config.mailConnection);
        var mailOptions = mail_config.welcomeToCorpusTeamMailOptions();
        if (user.appbrand === "phophlo") {
          mailOptions = mail_config.welcomeToCorpusTeamMailOptionsPhophlo();
        }
        mailOptions.to = user.email + "," + mailOptions.to;
        mailOptions.text = mailOptions.text.replace(/insert_corpus_identifier/g, newcorpusConnection.pouchname);
        mailOptions.html = mailOptions.html.replace(/insert_corpus_identifier/g, newcorpusConnection.pouchname);
        smtpTransport.sendMail(mailOptions, function(error, response) {
          if (error) {
            console.log(new Date() + " Mail error" + util.inspect(error));
          } else {
            console.log(new Date() + " Message sent: \n" + response.message);
            console.log(new Date() + " Sent User " + user.username + " a welcome to corpus email at " + user.email);
          }
          smtpTransport.close();
        });
      } else {
        console.log(new Date() + " Didnt email welcome to corpus to new user" + user.username + " why: emailpresent: " + user.email + ", valid user email: " + (user.email.length > 5) + ", mailconfig: " + (mail_config.mailConnection.auth.user !== ""));
      }
      return doneAddingCorpusToUser(
        null,
        rolesresult, {
          message: 'Added role(s) to user, and the user was emailed to tell them that they have been added to this corpus team.'
        });
    });

  });

};

var createNewCorpusesIfDontExist = function(user, userforcouchdb, corpuses) {
  /*
   * Creates the user's new corpus databases
   */
  for (var potentialnewcorpus in corpuses) {
    corpus_management.createDBforCorpus(
      userforcouchdb.corpuses[potentialnewcorpus],
      userforcouchdb,

      function(corpusConnectionThatWasCreated) {
        console.log(new Date() + " Added the corpus connection to the user in the database. " + util.inspect(corpusConnectionThatWasCreated) + "\n");
      },
      function(corpusConnectionThatWasNotCreated, alreadyexisted) {

        if (alreadyexisted == "corpus_existed") {
          console.log(new Date() + " The corpus already existed. " + util.inspect(corpusConnectionThatWasNotCreated) + "\n");
        } else {
          console.log(new Date() + " There was an error in creating the new corpus, when the user logs in again, we'll try again. " + util.inspect(corpusConnectionThatWasNotCreated) + "\n");
        }

      });
  }

};
/**
 * This function takes a user and a function. The done function is called back
 * with (error, user, info) where error contains the server's detailed error
 * (not to be shared with the client), and info contains a client readible error
 * message.
 *
 * @param user
 * @param done
 */

var saveUpdateUserToDatabase = function(user, done) {
  if (user.username == "lingllama" || user.username == "public") {
    return done(null, user, {
      message: "User is a reserved user and cannot be updated in this manner."
    });
  }

  // Preparing the couch connection
  var usersdb = nano.db.use(node_config.usersDbConnection.dbname);
  // Put the user in the database and callback
  usersdb.insert(user, user.username, function(error, resultuser) {
    if (error) {
      console.log(new Date() + " Error saving a user: " + util.inspect(error));
      console.log(new Date() + " This is the user who was not saved: " + util.inspect(user));
      return done(error, null, {
        message: 'Error saving a user in the database. '
      });
    } else {
      if (resultuser.ok) {
        console.log(new Date() + " No error saving a user: " + util.inspect(resultuser));
        user._rev = resultuser.rev;
        return done(null, user, {
          message: "User details saved."
        });
      } else {
        console.log(new Date() + " No error creating a user, but response was not okay: " + util.inspect(resultuser));
        return done(resultuser, null, {
          message: 'Unknown server result, this might be a bug.'
        });
      }
    }
  });
};

/**
 * This function connects to the usersdb, tries to retrieve the doc with the
 * provided id, returns the call of the done with (error, user, info)
 *
 * @param id
 * @param done
 */

var findById = function(id, done) {
  var usersdb = nano.db.use(node_config.usersDbConnection.dbname);
  usersdb.get(id, function(error, result) {
    if (error) {
      if (error.error == "not_found") {
        console.log(new Date() + ' No User found: ' + id);
        error = error || {};
        error.status = error.status || 401;
        return done({
          status: error,
          error: 'User ' + id + ' does not exist'
        }, null, {
          message: 'Username or password is invalid. Please try again.'
        });
      } else {
        console.log(new Date() + ' Error looking up the user: ' + id + '\n' + util.inspect(error));
        error = error || {};
        error.status = error.status || 500;
        return done(error, null, {
          message: 'Server is not responding for request to open the user `' + id + '`. Please report this error. '
        });
      }
    } else {
      if (result) {
        console.log(new Date() + ' User ' + id + ' found: \n' + util.inspect(result));
        return done(null, result, null);
      } else {
        console.log(new Date() + ' No User found: ' + id);
        return done({
          status: 401,
          error: 'User ' + id + ' does not exist'
        }, null, {
          message: 'Username or password is invalid. Please try again.'
        });
      }
    }
  });
};

/**
 * This function uses findById since we have decided to save usernames as id's
 * in the couchdb
 */
findByUsername = function(username, done, info) {
  return findById(username, done, info);
};

/**
 * This function accepts an old and new password, a user and a function to be
 * called with (error, user, info)
 *
 *
 * @param oldpassword
 * @param newpassword
 * @param username
 * @param done
 */
var setPassword = function(oldpassword, newpassword, username, done) {

  if (!username) {
    return done({
      status: 412,
      error: 'Please provide a username'
    }, null, {
      message: 'Please provide a username'
    });
  }

  var safeUsernameForCouchDB = username.trim().toLowerCase().replace(/[^0-9a-z]/g, "");
  if (username !== safeUsernameForCouchDB) {
    return done(err, null, {
      message: 'Username or password is invalid. Please try again.'
    });
  }

  var user = findByUsername(username, function(error, user, info) {
    if (error) {
      // console.log(new Date() + " Error looking up user  " + username + " : " + util.inspect(error));
      return done(error, null, info);
    }

    if (!user) {
      console.log(new Date() + " User " + username + " does not exist on this server " + util.inspect(user));
      return done({
        error: " User " + username + " does not exist on this server "
      }, null, info);
    }


    console.log(new Date() + " Found user in setPassword: " + util.inspect(user));

    bcrypt.compare(oldpassword, user.hash, function(err, passwordCorrect) {
      if (err) {
        return done(err, null, {
          message: 'Username or password is invalid. Please try again.'
        });
      }
      if (!passwordCorrect) {
        return done({
          error: "User entered an invalid passsword."
        }, null, {
          message: 'Username or password is invalid. Please try again.'
        });
      }
      if (passwordCorrect) {
        var salt = user.salt = bcrypt.genSaltSync(10);
        user.hash = bcrypt.hashSync(newpassword, salt);
        console.log(salt, user.hash);
        // Save new password to couch too
        corpus_management.changeUsersPassword(user.corpuses[user.corpuses.length - 1], user, newpassword,
          function(res) {
            console
              .log(new Date() + " There was success in creating changing the couchdb password: " + util.inspect(res) + "\n");
          },
          function(err) {
            console
              .log(new Date() + " There was an error in creating changing the couchdb password " + util.inspect(err) + "\n");
          });

        // Save user to database
        return saveUpdateUserToDatabase(user, done);

      }
    });

  });


};
module.exports.setPassword = setPassword;
/**
 * This function generates a temporary password which is alpha-numeric and 10
 * chars long
 *
 * @returns {String}
 */

var makeRandomPassword = function() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 10; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};

var verifyPassword = function(password, user, done) {
  /*
   * If the user didnt furnish a password, set a fake one. It will return
   * unauthorized.
   */
  if (!password) {
    password = " ";
  }
  bcrypt.compare(password, user.hash, done);
};
