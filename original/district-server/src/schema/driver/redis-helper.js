const redis = require('../../../redis');
const {
  expressDeliveryDriverTokenKey,
  expressDeliveryAllDriverTokenKey,
} = require('../../../redis/keys');
const {
  expressDelivery
} = require('../../../config');

exports.calculateDriverTokenKey = (orderSetId, driverId) => {
  return expressDeliveryDriverTokenKey({
    orderSetId,
    driverId,
  });
};

exports.saveDriverTokenKey = async (targetKey, token) => {
  return redis.set(
    targetKey,
    JSON.stringify(token),
    'EX',
    expressDelivery.redis.ttlSeconds
  );
};

exports.getDriverTokenKey = async targetKey => {
  return redis.getByKeyAndParse(targetKey);
};

exports.updateDriverKeyTTLByOrderId = async (orderSetId, driverId) => {
  try {
    const targetKey = this.calculateDriverTokenKey(orderSetId, driverId);
    const cachedToken = await redis.getByKeyAndParse(targetKey);
    return redis.set(
      targetKey,
      JSON.stringify(cachedToken),
      'EX',
      expressDelivery.redis.accessTimeAfterOrderDelivered
    );
  } catch (error) {}
};

exports.deleteDriverKeyByOrderId = async (orderSetId, driverId) => {
  try {
    const targetKey = this.calculateDriverTokenKey(orderSetId, driverId);
    await redis.del(targetKey);
    return true;
  } catch (error) {
    return false;
  }
};

exports.deleteOtherDriversKeyByOrderId = async (orderSetId, driverId) => {
  try {
    const keys = await redis.keys(expressDeliveryAllDriverTokenKey({orderSetId}));
    const deletedKeys = keys.filter(key => !key.endsWith(driverId));
    if (deletedKeys.length > 0) {
      return redis.del(...[deletedKeys]);
    }
    return true;
  } catch (error) {
    return false;
  }
};
