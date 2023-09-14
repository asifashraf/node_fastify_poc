exports.up = knex =>
  knex.schema.alterTable('loyalty_orders', table => {
    table.string('payment_service');
  });

exports.down = knex =>
  knex.schema.table('loyalty_orders', table => {
    table.dropColumn('payment_service');
  });
