exports.up = knex =>
  knex.schema.table('order_sets', table =>
    table.string('payment_method', 32).defaultTo(null)
  );

exports.down = knex =>
  knex.schema.table('order_sets', table => table.dropColumn('payment_method'));
