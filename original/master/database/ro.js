const { env, database } = require('../config');

const knexConfig = require('../knexfile');

const conf = knexConfig[env];

let knex = null;

if (database.readOnlyConnection) {
  conf.connection = database.readOnlyConnection;
  knex = require('knex')(conf);
}

module.exports = knex;
