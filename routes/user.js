/* Load modules provided by $ npm install, see package.json for details */
var swagger = require('swagger-node-express');
var param = require('../node_modules/swagger-node-express/Common/node/paramTypes.js');
var diacritics = require('diacritics');

/* Load modules provided by this codebase */
var UserLib = require('../../FieldDB/api/user/UserGeneric');
var CorpusConnectionLib = require('../../FieldDB/api/corpus/CorpusConnection');
var appVersion = require('../package.json').version;


var defaultCorpusConnectionFactory = new CorpusConnectionLib({
	'dbname': 'public-firstcorpus'
}, diacritics);
var UserFactory = new UserLib(appVersion, defaultCorpusConnectionFactory, diacritics);


/* export functions which can be used as API routes */

exports.appVersion = appVersion;
exports.UserSchema = UserFactory.baseSchema;
exports.CorpusConnectionSchema = defaultCorpusConnectionFactory.baseSchema;

exports.createUserByUsername = {
	'spec': {
		'path': '/user/{username}',
		'description': 'Operations about users accounts',
		'notes': 'Registers a user for a given username',
		'summary': 'Register user(s)',
		'method': 'POST',
		'parameters': [param.path('username', 'requested username of the user to be created', 'string')
		],
		'responseClass': 'User',
		'errorResponses': [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
		'nickname': 'createUserByUsername'
	},
	'action': function(req, res, next) {
		console.log('Request for register.');
		if (!req.params.username) {
			throw swagger.errors.invalid('username');
		}
		var username = req.params.username;
		try {

			var newUsersCorpusConnection = defaultCorpusConnectionFactory.set(null, {
				dbname: username + '-firstcorpus'
			});

			var user = UserFactory.set(null, {
				username: username
			}, newUsersCorpusConnection);

			if (user) {
				console.log(new Date() + ' Registered new user ' + user.username);
				res.send(user);
			} else {
				throw swagger.errors.notFound('user');
			}

		} catch (e) {
			console.log('hi');
			throw swagger.errors.invalid('username');
		}
	}
};
