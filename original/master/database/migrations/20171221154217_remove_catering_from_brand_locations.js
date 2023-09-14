exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('has_catering');
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table
      .boolean('has_catering')
      .default(false)
      .notNullable();
  });
