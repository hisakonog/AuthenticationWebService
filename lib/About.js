module.exports = function FieldDB(args) {

	this.getApiDocs = function(req, res, next) {
		res.send("getApiDocs");
	};

	this.getVersion = function(req, res, next) {
		res.send("getVersion");
	};

	this.installFieldDB = function(req, res, next) {
		res.send("installFieldDB");
	};
	return this;
};