//const pgsql = require('./pgsql');
const redis = require('./redis');
const knex = require('./knex');

module.exports = async (opts) => ({
    cache: {
        primary: await redis(opts),
    },
    db: {
        primary: await knex(opts),
    }
});