const redis = require('../../../redis');
const { countryCurrencyLookupKey } = require('../../../redis/keys');

exports.invalidateCountryCurrencyLookup = () => {
  return redis.del(countryCurrencyLookupKey);
};
