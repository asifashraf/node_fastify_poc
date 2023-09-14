const { brandStatus } = require('./../../src/schema/root/enums');

exports.up = knex =>
  knex.schema.alterTable('brands', table => {
    table.boolean('catering').defaultTo(false);
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('catering');
  });
