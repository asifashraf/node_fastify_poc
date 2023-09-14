exports.up = knex =>
  knex.schema.table('order_fulfillment', table => {
    table.string('courier_name');
  });

exports.down = knex =>
  knex.schema.table('order_fulfillment', table => {
    table.dropColumn('courier_name');
  });
