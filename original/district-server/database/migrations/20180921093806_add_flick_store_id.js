exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table.integer('flick_store_id');
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('flick_store_id');
  });
