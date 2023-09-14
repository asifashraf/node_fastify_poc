const redis = require('../../../redis');
const { redisTimeParameter } = require('../../../config');
const { carouselItemKey } = require('../../../redis/keys');

exports.getCachedCarouselItems = async targetKey => {
  return redis.getByKeyAndParse(targetKey);
};

exports.saveCachedCarouselItems = async (targetKey, items) => {
  await redis.set(
    targetKey,
    JSON.stringify(items),
    'EX',
    redisTimeParameter.oneHourInSeconds * 2
  );
};

exports.calculateCarouselItemsKey = countryId => {
  return carouselItemKey({
    countryId,
  });
};

exports.invalidateCarouselItems = () => {
  return redis.delKeys('carouselItems:*');
};
