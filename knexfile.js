// Update with your config settings.
require('dotenv').config({ silent: true });
const { snakeCase,mapKeys,camelCase } = require('lodash');
const env = Object.assign(
    { NODE_ENV: 'development' },
    process.env
);

function transformToCamelCase(data) {
    assert(isArray(data), 'Must be an array of objects');
    return data.map(obj => objTransformToCamelCase(obj));
}

function objTransformToCamelCase(obj) {
    mapKeys(obj, (value, key) => {
        const newKey = camelCase(key);
        delete obj[key];
        obj[newKey] = value;
    });
    return obj;
}

const postProcessResponse = (result, queryContext) => {
    if (!result) return result;
    if (Array.isArray(result)) {
        return transformToCamelCase(result);
    } else {
        return objTransformToCamelCase(result);
    }
};

const wrapIdentifier = (value, origImpl, queryContext) => {
    // lodash.snakeCase removes special chars so we have to except those
    if (['*'].includes(value)) return origImpl(value);
    return origImpl(snakeCase(value));
};

const database = {
    pgsql: {
        host: env.DB_HOST || 'localhost',
        port: env.DB_PORT || 5432,
        database: env.DB_NAME || 'dbname',
        user: env.DB_USER || 'postgres',
        password: env.DB_PASSWORD || ''
    }
}

module.exports = {
    development: {
        client: 'pg',
        debug: false, // set true to log all queries
        migrations: {
            directory: './src/database/migrations',
            tableName: 'migrations',
        },
        seeds: {
            directory: './src/database/seeds/development',
        },
        connection: database.pgsql,
        pool: {
            min: 1,
            max: 8,
            // destroy operations are awaited for at most this many milliseconds
            // new resources will be created after this timeout
            destroyTimeoutMillis: 5000,
            // free resources are destroyed after this many milliseconds
            idleTimeoutMillis: 60000,
            // how often to check for idle resources to destroy
            reapIntervalMillis: 10000,
        },
        postProcessResponse,
        wrapIdentifier,
    },
    staging: {
        client: 'pg',
        debug: false, // set true to log all queries
        migrations: {
            directory: './src/database/migrations',
            tableName: 'migrations',
        },
        seeds: {
            directory: './database/seeds/development',
        },
        connection: database.pgsql,
        pool: {
            min: 1,
            max: 8,
            // destroy operations are awaited for at most this many milliseconds
            // new resources will be created after this timeout
            destroyTimeoutMillis: 5000,
            // free resources are destroyed after this many milliseconds
            idleTimeoutMillis: 60000,
            // how often to check for idle resources to destroy
            reapIntervalMillis: 10000,
        },
        postProcessResponse,
        wrapIdentifier,
    },
    production: {
        client: 'pg',
        migrations: {
            directory: './src/database/migrations',
            tableName: 'migrations',
        },
        seeds: {
            directory: './database/seeds/production',
        },
        connection: database.pgsql,
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
        postProcessResponse,
        wrapIdentifier,
    }

};
