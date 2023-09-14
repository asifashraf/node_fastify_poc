exports.up = knex =>
  knex.schema.table('order_fulfillment', table => {
    table
      .boolean('asap')
      .default(false)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('order_fulfillment', table => {
    table.dropColumn('asap');
  });
