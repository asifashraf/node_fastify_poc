exports.up = knex =>
  knex.schema.table('order_sets', table => {
    table.string('pos_order_id');
  });

exports.down = knex =>
  knex.schema.table('order_sets', table => {
    table.dropColumn('pos_order_id');
  });
