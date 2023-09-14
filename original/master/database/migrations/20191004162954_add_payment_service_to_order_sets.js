exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.string('payment_service');
  });

exports.down = knex =>
  knex.schema.table('order_sets', table => {
    table.dropColumn('payment_service');
  });
