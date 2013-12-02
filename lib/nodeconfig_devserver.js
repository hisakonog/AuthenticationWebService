exports.port = "3183";
exports.httpsOptions = {
  "key": 'fielddb_debug.key',
  "cert": 'fielddb_debug.crt',
  "port": "3183",
  "host": "corpusdev.lingsync.org",
  "method": 'POST'
};
exports.usersDbConnection = {
  "protocol": 'https://',
  "domain": 'corpusdev.lingsync.org',
  "port": '443',
  "dbname": 'zfielddbuserscouch',
  "path": ""
};
exports.usersDBExternalDomainName = "corpusdev.lingsync.org";
exports.userFriendlyServerName = "Example Beta";
exports.servers = {
  localhost: {
    auth: "https://localhost:3183",
    corpus: "https://localhost:6984",
    serverCode: "localhost",
    userFriendlyServerName: "Localhost"
  },
  testing: {
    auth: "https://authdev.example.com",
    corpus: "https://corpusdev.example.com",
    serverCode: "testing",
    userFriendlyServerName: "Example Beta"
  },
  production: {
    auth: "https://auth.example.com",
    corpus: "https://corpus.example.com",
    serverCode: "production",
    userFriendlyServerName: "Example"
  }
};