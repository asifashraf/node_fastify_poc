const knex = require('knex');
const { attachPaginate } = require('knex-paginate');
attachPaginate();

module.exports = async ({ logger, config }) => {
    const _knex = knex({
        client: 'pg',
        migrations: {
            directory: './database/migrations',
            tableName: 'migrations',
        },
        connection: config.db.pgsql,
        pool: {
            min: 5,
            max: 15,
            // destroy operations are awaited for at most this many milliseconds
            // new resources will be created after this timeout
            // destroyTimeoutMillis: 5000,
            // free resources are destroyed after this many milliseconds
            idleTimeoutMillis: 20000,
            // how often to check for idle resources to destroy
            reapIntervalMillis: 10000,
        },
        log: {
            warn(message) {
                logger.warn(message);
            },
            error(message) {
                logger.error(message);
            },
            debug(message) {
                logger.debug(message);
            },
        },
    });

    logger.info('KNEX is [ready]');

    return _knex;
}
