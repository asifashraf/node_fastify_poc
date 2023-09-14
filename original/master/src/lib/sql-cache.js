const crypto = require('crypto');

const { isTest, enableSqlCache } = require('../../config');
const redis = require('../../redis');
const { sqlCacheKey } = require('../../redis/keys');

function sqlCache(cacheEnabled = enableSqlCache) {
  if (isTest) {
    cacheEnabled = false;
  }
  // console.log(cacheEnabled);
  return async (sql, time = '60') => {
    if (!cacheEnabled) {
      return sql;
    }

    const sqlHash = crypto
      .createHash('md5')
      .update(sql.toString())
      .digest('hex');
    const key = sqlCacheKey({ sqlHash });
    let sqlResults = await redis.get(key);
    if (sqlResults) {
      return JSON.parse(sqlResults);
    }
    sqlResults = await sql;
    await redis.setex(key, parseInt(time, 10), JSON.stringify(sqlResults));
    return sqlResults;
  };
}

module.exports = { sqlCache };
