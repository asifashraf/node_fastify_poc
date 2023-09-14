const redis = require('../../../../redis');
const { expressDelivery } = require('../../../../config');

exports.saveAuthToken = async (targetKey, token) => {
  return redis.set(
    targetKey,
    JSON.stringify(token),
    'EX',
    expressDelivery.redis.ttlSeconds
  );
};

exports.getAuthToken = async (targetKey) => {
  return redis.getByKeyAndParse(targetKey);
};

exports.deleteAuthToken = async (targetKey) => {
  try {
    await redis.del(targetKey);
    return true;
  } catch (error) {
    return false;
  }
};
