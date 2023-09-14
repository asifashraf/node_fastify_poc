exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('short_address');
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table.string('short_address');
  });
