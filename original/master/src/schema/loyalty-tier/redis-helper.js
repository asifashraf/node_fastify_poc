const redis = require('../../../redis');

const { loyaltyTiersKey } = require('../../../redis/keys');

exports.getCachedLoyaltyTiers = async targetKey => {
  return redis.getByKeyAndParse(targetKey);
};

exports.saveCachedLoyaltyTiers = async (targetKey, locations) => {
  return redis.set(targetKey, JSON.stringify(locations));
};

exports.calculateLoyaltyTiersKey = params => {
  let accessKey;
  if (
    Object.keys(params).length === 0 ||
    (!params.countryId && !params.countryCode)
  ) {
    accessKey = 'all';
  } else if (params.countryId) {
    accessKey = params.countryId;
  } else {
    accessKey = params.countryCode;
  }
  accessKey += ':' + params.status;
  return loyaltyTiersKey({
    params: accessKey,
  });
};

exports.invalidateLoyaltyTiersCache = () => {
  return redis.delKeys('loyaltyTiers:*');
};
