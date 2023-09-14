exports.up = knex =>
  knex.schema.alterTable('brand_locations', table => {
    table
      .boolean('is_automatic_delivery_integration_active')
      .notNullable()
      .default(true);
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('is_automatic_delivery_integration_active');
  });
