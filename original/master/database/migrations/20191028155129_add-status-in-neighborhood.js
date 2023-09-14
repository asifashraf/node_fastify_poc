const { statusTypes } = require('./../../src/schema/root/enums');

exports.up = knex =>
  knex.schema.alterTable('neighborhoods', table => {
    table
      .string('status')
      .defaultTo(statusTypes.ACTIVE)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('neighborhoods', table => {
    table.dropColumn('status');
  });
