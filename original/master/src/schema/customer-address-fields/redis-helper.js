const redis = require('../../../redis');

const { addressFieldsKey } = require('../../../redis/keys');

exports.getCachedAddressFields = async targetKey => {
  return redis.getByKeyAndParse(targetKey);
};

exports.saveCachedAddressFields = async (targetKey, locations) => {
  return redis.set(targetKey, JSON.stringify(locations));
};

exports.calculateAddressFieldsKey = key => {
  const accessKey = key ? key : 'all';
  return addressFieldsKey({
    params: accessKey,
  });
};

exports.invalidateAddressFieldsCache = () => {
  return redis.delKeys('addressFields:*');
};
