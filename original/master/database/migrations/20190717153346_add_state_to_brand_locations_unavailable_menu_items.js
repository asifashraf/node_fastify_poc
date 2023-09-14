exports.up = knex =>
  knex.schema.table('brand_locations_unavailable_menu_items', table =>
    table
      .enum('state', ['SOLD_OUT', 'NOT_COMMERCIALIZED'])
      .defaultTo('NOT_COMMERCIALIZED')
  );

exports.down = knex =>
  knex.schema.table('brand_locations_unavailable_menu_items', table =>
    table.dropColumn('state')
  );
