var swagger = require('swagger-node-express');
var param = require("../node_modules/swagger-node-express/Common/node/paramTypes.js");

exports.getUserById = {
		'spec': {
			"description": "Operations about pets",
			"path": "/user/{userId}",
			"notes": "Returns a user based on ID",
			"summary": "Find user by ID",
			"method": "GET",
			"params": [param.path("userId", "ID of user that needs to be fetched", "string")],
			"responseClass": "User",
			"errorResponses": [swagger.errors.invalid('id'), swagger.errors.notFound('user')],
			"nickname": "getUserById"
		},
		'action': function(req, res) {
			if (!req.params.userId) {
				throw swagger.errors.invalid('id');
			}
			var id = req.params.userId;
			var user = {'id': id};

			if (user) res.send(JSON.stringify(user));
			else throw swagger.errors.notFound('user');
		}
	};