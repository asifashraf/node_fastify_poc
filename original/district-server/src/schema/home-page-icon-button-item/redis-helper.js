const redis = require('../../../redis');
const { redisTimeParameter } = require('../../../config');
const { iconButtonItemKey } = require('../../../redis/keys');

exports.getCachedIconButtonItems = async targetKey => {
  return redis.getByKeyAndParse(targetKey);
};

exports.saveCachedIconButtonItems = async (targetKey, items) => {
  await redis.set(
    targetKey,
    JSON.stringify(items),
    'EX',
    redisTimeParameter.oneHourInSeconds * 2
  );
};

exports.calculateIconButtonItemsKey = countryId => {
  return iconButtonItemKey({
    countryId,
  });
};

exports.invalidateIconButtonItems = () => {
  return redis.delKeys('iconButtonItems:*');
};
