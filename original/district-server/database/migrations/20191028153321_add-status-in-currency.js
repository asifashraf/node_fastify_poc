const { statusTypes } = require('./../../src/schema/root/enums');

exports.up = knex =>
  knex.schema.alterTable('currencies', table => {
    table
      .string('status')
      .defaultTo(statusTypes.ACTIVE)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('currencies', table => {
    table.dropColumn('status');
  });
