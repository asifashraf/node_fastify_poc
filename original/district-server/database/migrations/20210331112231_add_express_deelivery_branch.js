exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table.boolean('allow_express_delivery').default(false);
    table
      .specificType('express_delivery_radius', 'numeric(13, 3)')
      .default(0.0);
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('allow_express_delivery');
    table.dropColumn('express_delivery_radius');
  });
