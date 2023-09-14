const { brandStatus } = require('./../../src/schema/root/enums');

exports.up = knex =>
  knex.schema.alterTable('brands', table => {
    table
      .string('status')
      .defaultTo(brandStatus.ACTIVE)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('status');
  });
