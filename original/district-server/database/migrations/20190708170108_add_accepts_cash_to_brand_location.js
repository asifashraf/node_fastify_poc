exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table
      .boolean('accepts_cash')
      .defaultTo(false)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('accepts_cash');
  });
