require('dotenv').config({ silent: true });
// process.env lookups are extremely expensive so we cache it here
const env = Object.assign(
  { NODE_ENV: 'development', S3_MAX_FILE_UPLOAD_BYTES: 10485760 },
  process.env
);
const AWS = require('aws-sdk');

const PORT = process.env.PORT || 4000;
global.secrets = {};
function collectConfig() {
  const region = 'eu-west-1';
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  const secretsManager = new AWS.SecretsManager({
    accessKeyId,
    secretAccessKey,
    region,
  });
  // const profile =
  //   process.env.NODE_ENV === 'development' ? 'qa' : process.env.NODE_ENV;
  const secretName = env.NODE_ENV + '/cofe-district-server/infra';
  const params = {
    SecretId: secretName,
  };

  return new Promise(function (resolve, reject) {
    secretsManager.getSecretValue(params, function (err, data) {
      if (err) {
        console.error('Some error calling secret manager' + err);
        reject();
      } else {
        global.secrets = JSON.parse(data.SecretString);
        // console.log(global.secrets);
        resolve();
      }
    });
  });
}

module.exports = {
  collectConfig,
  PORT,
};
