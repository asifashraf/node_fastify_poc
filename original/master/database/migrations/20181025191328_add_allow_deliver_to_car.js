exports.up = knex =>
  knex.schema.table('brand_locations', table =>
    table.boolean('allow_deliver_to_car').default(false)
  );

exports.down = knex =>
  knex.schema.table('brand_locations', table =>
    table.dropColumn('allow_deliver_to_car')
  );
