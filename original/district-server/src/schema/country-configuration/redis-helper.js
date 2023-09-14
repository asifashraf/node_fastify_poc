const redis = require('../../../redis');
const { countryConfigsKey, countryConfigInfoByKey } = require('../../../redis/keys');

exports.invalidateCountryConfigsCache = () => {
  return redis.del(countryConfigsKey);
};


exports.invalidatecountryConfigInfoByKeyCache = () => {
  const redisKey = countryConfigInfoByKey({
    key: '*'
  });
  return redis.delKeys(redisKey);
};
