require('dotenv').config({ silent: true });
const { types } = require('pg');
const {
  transformToCamelCase,
  objTransformToCamelCase,
} = require('./src/lib/util');
const { snakeCase } = require('lodash');

const env = Object.assign(
  { NODE_ENV: 'development', S3_MAX_FILE_UPLOAD_BYTES: 10485760 },
  process.env,
);
global.secrets = global.secrets || {};

const database = {
  connection: global.secrets.DATABASE_URL || env.DATABASE_URL,
  readOnlyConnection: env.RO_DATABASE_URL || null,
  localTestConnection:
    env.LOCALTEST_DATABASE_URL ||
    'postgres://localhost:5432/cofe-district-test',
};

// override parsing date column to Date()
types.setTypeParser(1082, val => val);

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

module.exports = {
  development: {
    client: 'pg',
    debug: false, // set true to log all queries
    migrations: {
      directory: './database/migrations',
      tableName: 'migrations',
    },
    seeds: {
      directory: './database/seeds/development',
    },
    connection: database.connection,
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
      directory: './database/migrations',
      tableName: 'migrations',
    },
    seeds: {
      directory: './database/seeds/development',
    },
    connection: database.connection,
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

  localtest: {
    client: 'pg',
    // debug: true,
    migrations: {
      directory: './database/migrations',
      tableName: 'migrations',
    },
    seeds: {
      directory: './database/seeds/development',
    },
    connection: database.localTestConnection,
    pool: { min: 0, max: 1 },
    postProcessResponse,
    wrapIdentifier,
  },

  production: {
    client: 'pg',
    migrations: {
      directory: './database/migrations',
      tableName: 'migrations',
    },
    seeds: {
      directory: './database/seeds/production',
    },
    connection: database.connection,
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
  },
  onUpdateTrigger: table => `
    CREATE TRIGGER ${table}_on_update_timestamp
    BEFORE UPDATE ON ${table}
    FOR EACH ROW
    EXECUTE PROCEDURE on_update_timestamp();
    `,
};
