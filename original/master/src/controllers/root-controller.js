const { gitRevision } = require('../lib/util');
const { iOSAuth0Config } = require('../../config');
const { iOSKeychainCredentials } = require('../lib/auth');

exports.versionController = async (req, res) => {
  res.type('text/html').send(gitRevision());
};

exports.appleAppSiteAssociation = (body, res) => {
  res.type('application/pkcs7-mime');
  res.send(iOSKeychainCredentials);
};

exports.auth0IosConfig = (body, res) => {
  res.send(iOSAuth0Config);
};
