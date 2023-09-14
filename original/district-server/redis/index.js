const Redis = require('ioredis');

const { redis: redisConfig, isTest } = require('../config');

const connectionString = isTest
  ? redisConfig.testConnection
  : redisConfig.connection;

const redis = new Redis(connectionString);

redis.delKeys = async function (keyPattern) {
  const stream = redis.scanStream({
    match: keyPattern,
  });
  stream.on('data', async data => {
    if (data.length > 0) {
      await this.del(data);
    }
  });
};

redis.getByKeyAndParse = async targetKey => {
  let cachedContent = await redis.get(targetKey);
  if (cachedContent) {
    cachedContent = JSON.parse(cachedContent);
  }
  return cachedContent;
};

module.exports = redis;
