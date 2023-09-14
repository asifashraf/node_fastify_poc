const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const encryptStringWithRsaPublicKey = function (
  toEncrypt,
  relativeOrAbsolutePathToPublicKey
) {
  const absolutePath = path.resolve(relativeOrAbsolutePathToPublicKey);
  const publicKey = fs.readFileSync(absolutePath, 'utf8');
  const buffer = Buffer.from(toEncrypt);
  const encrypted = crypto.publicEncrypt(publicKey, buffer);
  return encrypted.toString('base64');
};

const decryptStringWithRsaPrivateKey = function (
  toDecrypt,
  relativeOrAbsolutePathtoPrivateKey
) {
  const absolutePath = path.resolve(relativeOrAbsolutePathtoPrivateKey);
  const privateKey = fs.readFileSync(absolutePath, 'utf8');
  const buffer = Buffer.from(toDecrypt, 'base64');
  const decrypted = crypto.privateDecrypt(privateKey, buffer);
  return decrypted.toString('utf8');
};

const publicKeyPath = path.join(
  __dirname,
  'encryption-keys/enc-public-key.pem'
);
const privateKeyPath = path.join(
  __dirname,
  'encryption-keys/enc-private-key.pem'
);

function encrypt(val) {
  return encryptStringWithRsaPublicKey(val, publicKeyPath);
}

function decrypt(val) {
  return decryptStringWithRsaPrivateKey(val, privateKeyPath);
}

module.exports = {
  encrypt,
  decrypt,
};
