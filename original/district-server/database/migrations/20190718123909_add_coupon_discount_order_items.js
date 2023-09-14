exports.up = knex =>
  knex.schema.table('order_items', table => {
    table.specificType('coupon_per_quantity', 'numeric(13, 3)').default(0);
  });

exports.down = knex =>
  knex.schema.table('order_items', table => {
    table.dropColumn('coupon_per_quantity');
  });
