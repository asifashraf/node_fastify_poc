exports.up = knex =>
  knex.schema
    .table('order_sets', table => {
      table
        .boolean('paid')
        .defaultsTo(false)
        .notNullable();
    })
    .then(() =>
      knex('order_sets')
        .update('paid', true)
        .whereIn('id', function() {
          this.select('reference_order_id')
            .from('payment_statuses')
            .where('name', 'PAYMENT_SUCCESS')
            .where('order_type', 'ORDER_SET');
        })
    );

exports.down = knex =>
  knex.schema.table('order_sets', table => {
    table.dropColumn('paid');
  });
