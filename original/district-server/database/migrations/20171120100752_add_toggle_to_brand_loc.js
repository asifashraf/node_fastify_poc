exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table
      .boolean('accepting_orders')
      .notNullable()
      .default(true);
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('accepting_orders');
  });
