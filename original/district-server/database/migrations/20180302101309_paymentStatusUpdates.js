exports.up = knex =>
  knex.schema.table('payment_statuses', table => {
    table.dropForeign('order_set_id');
    table.renameColumn('order_set_id', 'reference_order_id');
    table
      .string('order_type')
      .notNullable()
      .default('ORDER_SET')
      .index();
  });

exports.down = knex =>
  knex.schema.table('payment_statuses', table => {
    table.renameColumn('reference_order_id', 'order_set_id');
    table
      .foreign('order_set_id')
      .references('id')
      .inTable('order_sets')
      .onDelete('CASCADE');
    table.dropColumn('order_type');
  });
