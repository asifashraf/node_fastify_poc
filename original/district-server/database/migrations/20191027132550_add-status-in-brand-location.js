const { brandLocationStatus } = require('./../../src/schema/root/enums');

exports.up = knex =>
  knex.schema.alterTable('brand_locations', table => {
    table
      .string('status')
      .defaultTo(brandLocationStatus.ACTIVE)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('status');
  });
