exports.up = knex =>
  knex.schema.table('order_sets', table => {
    table.dropColumn('transaction_id');
  });

exports.down = knex =>
  knex.schema.table('order_sets', table => {
    table.string('transaction_id');
  });
