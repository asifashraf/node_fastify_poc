const redis = require('../../../redis');
const { redisTimeParameter } = require('../../../config');
const { arrivedMposOrderKey, brandLocationStoreAvailabilityKeyByFulfillment } = require('../../../redis/keys');

exports.getCachedArrivedOrder = async targetKey => {
  return redis.getByKeyAndParse(targetKey);
};

exports.saveCachedArrivedOrder = async (targetKey) => {
  await redis.set(
    targetKey,
    true,
    'EX',
    redisTimeParameter.oneHourInSeconds * 2
  );
};

exports.calculateArrivedOrderKey = orderSetId => {
  return arrivedMposOrderKey({
    orderSetId,
  });
};

exports.getCachedStoreStatusByMultipleKeys = async targetKeys => {
  if (targetKeys.length === 0) return [];
  const parsedStoreDataList = await redis.mget(targetKeys);
  return parsedStoreDataList;
};

exports.calculateBrandLocationStoreAvailabilityKey = (brandLocationId, fulfillment) => {
  return brandLocationStoreAvailabilityKeyByFulfillment({brandLocationId, fulfillment});
};
