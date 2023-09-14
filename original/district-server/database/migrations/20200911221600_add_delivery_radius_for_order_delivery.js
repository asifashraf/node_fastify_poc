exports.up = knex =>
  knex.schema.alterTable('brand_locations', table => {
    table.specificType('delivery_radius', 'numeric(13, 3)').default(0.0);
  });

exports.down = knex =>
  knex.schema.alterTable('brand_locations', table => {
    table.dropColumn('delivery_radius');
  });
