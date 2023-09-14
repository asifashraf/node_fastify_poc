const knex = require('./index');
const Promise = require('bluebird');

async function wipeDb() {
  await knex.raw('DROP EXTENSION IF EXISTS postgis CASCADE');
  return knex
    .raw(
      `select 'drop table if exists "' || tablename || '" cascade;' as cmd
    from pg_tables
    where schemaname = 'public';`
    )
    .then(result => result.rows.map(r => r.cmd))
    .then(commands => Promise.each(commands, cmd => knex.raw(cmd)));
}

module.exports = wipeDb;
