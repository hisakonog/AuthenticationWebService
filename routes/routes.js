var userRoutes = require('./user');

/* Load modules provided by $ npm install, see package.json for details */
var swagger = require('swagger-node-express');

var UserSchema = require('../lib/UserSchema');
var APIModelShema = {};
APIModelShema.models = {
	'User': UserSchema
};

var setup = function(api) {
	swagger.configureSwaggerPaths("", "/api", "");
	swagger.setAppHandler(api);
	swagger.addModels(APIModelShema);
	swagger.addGet(userRoutes.getUserById);

	swagger.configure("https://localhost:3183", "1.72.1");
};
exports.setup = setup;