exports.up = knex =>
  knex.schema.table('order_sets', table => {
    table
      .boolean('acknowledged')
      .default(false)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('order_sets', table => {
    table.dropColumn('acknowledged');
  });
