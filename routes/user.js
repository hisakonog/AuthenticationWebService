/* Load modules provided by $ npm install, see package.json for details */
var swagger = require('swagger-node-express');
var param = require('../node_modules/swagger-node-express/Common/node/paramTypes.js');
var appVersion = require('../package.json').version;

exports.getUsers = {
	'spec': {
		'path': '/users/{username}',
		'description': 'Operations about users accounts',
		'notes': 'Requests users details if authenticated',
		'summary': 'Retrieves user(s)',
		'method': 'GET',
		'parameters': [param.path('username', 'requested username of the user to be created', 'string')],
		'responseClass': 'User',
		'errorResponses': [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
		'nickname': 'getUsers'
	},
	'action': function(req, res, next) {
		res.send({});
	}
};

exports.postUsers = {
	'spec': {
		'path': '/users/{username}',
		'description': 'Operations about users accounts',
		'notes': 'Registers a user for a given username',
		'summary': 'Register user(s)',
		'method': 'POST',
		'parameters': [param.path('username', 'requested username of the user to be created', 'string')],
		'responseClass': 'User',
		'errorResponses': [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
		'nickname': 'postUsers'
	},
	'action': function(req, res, next) {
		res.send({});
	}
};

exports.putUsers = {
	'spec': {
		'path': '/users/{username}',
		'description': 'Operations about users accounts',
		'notes': 'Updates users details if authenticated',
		'summary': 'Updates user(s)',
		'method': 'PUT',
		'parameters': [param.path('username', 'requested username of the user to be created', 'string')],
		'responseClass': 'User',
		'errorResponses': [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
		'nickname': 'putUsers'
	},
	'action': function(req, res, next) {
		res.send({});
	}
};

exports.deleteUsers = {
	'spec': {
		'path': '/users/{username}',
		'description': 'Operations about users accounts',
		'notes': 'Deletes user acount if authenticated',
		'summary': 'Deletes user(s)',
		'method': 'PUT',
		'parameters': [param.path('username', 'requested username of the user to be created', 'string')],
		'responseClass': 'User',
		'errorResponses': [swagger.errors.invalid('username'), swagger.errors.notFound('user')],
		'nickname': 'deleteUsers'
	},
	'action': function(req, res, next) {
		res.send({});
	}
};
