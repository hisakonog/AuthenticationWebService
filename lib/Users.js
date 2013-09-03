var util = require('util');
module.exports = function Users(args) {

	var authenticationfunctions = args.authentication || {};
	var corpus = args.corpus || {};
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
	this.createUsers = function(req, res, next) {

		authenticationfunctions.registerNewUser('local', req, function(err, user, info) {
			var returndata = {};
			if (err) {
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
			res.send(returndata);

		});
	};

	this.updateUsers = function(req, res, next) {
		authenticationfunctions.authenticateUser(req.body.username, req.body.password, req, function(err, user, info) {
			var returndata = {};
			if (err) {
				console.log(new Date() + " There was an error in the authenticationfunctions.authenticateUser:\n" + util.inspect(err));
				returndata.userFriendlyErrors = [info.message];
			}
			if (!user) {
				returndata.userFriendlyErrors = [info.message];
			} else {
				returndata.user = user;
				delete returndata.user.serverlogs;
				returndata.info = [info.message];
				console.log(new Date() + " Returning the existing user as json:\n" + util.inspect(user));
			}
			console.log(new Date() + " Returning response:\n" + util.inspect(returndata));
			res.send(returndata);
		});
	};
	this.getUsers = function(req, res, next) {
		res.send({
			'error': 'Unauthorized'
		});
	};
	this.deleteUsers = function(req, res, next) {
		res.send({
			'error': 'Unauthorized'
		});
	};

	this.addUserRoles = function(req, res, next) {
		res.send('addUserRoles');
	};
	this.updateUserRoles = function(req, res, next) {
		res.send('updateUserRoles');
	};
	this.getUserRoles = function(req, res, next) {
		res.send('getUserRoles');
	};
	this.deleteUserRoles = function(req, res, next) {
		res.send('deleteUserRoles');
	};
	return this;
};