/* Load modules provided by $ npm install, see package.json for details */
var swagger = require('swagger-node-express');

/* Load modules provided by this codebase */
var userRoutes = require('./user');

var setup = function(api) {

	swagger.configureSwaggerPaths('', '/api', '');
	swagger.setAppHandler(api);

	/* Prepare models for the API Schema info using the info the routes provide */
	var APIModelShema = {};
	APIModelShema.models = {
		'User': userRoutes.UserSchema,
		'CouchConnection': userRoutes.CorpusConnectionSchema
	};
	swagger.addModels(APIModelShema);

	/* Declare available APIs */
	swagger.addPost(userRoutes.createUserByUsername);

	swagger.configure('https://localhost:3183', userRoutes.appVersion);
};
exports.setup = setup;