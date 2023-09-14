exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table.string('email');
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('email');
  });
