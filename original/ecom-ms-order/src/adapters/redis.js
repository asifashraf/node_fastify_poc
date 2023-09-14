const IORedis = require('ioredis');

module.exports = async ({ logger, config }) => {
    const dbConfig = config.redis;

    const client = new IORedis({
        host: dbConfig.host,
        port: dbConfig.port,
        connectTimeout: 500,
        maxRetriesPerRequest: 1,
    });
    
    client
        .on('ready', () => {
            logger.info('REDIS_EVENT [ready]');
        })
        .on('error', (err) => {
            logger.error(`REDIS_EVENT [error] ${err.message}`);
        })
        .on('end', () => {
            logger.info('REDIS_EVENT [disconnect]');
        });

    return client;
}