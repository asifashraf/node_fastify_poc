exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.string('only_first_orders_for', 32).defaultTo(null);
    table.integer('first_orders_redemption_limit').default(0);
  });

exports.down = knex =>
  knex.schema.alterTable('coupons', table => {
    table.dropColumn('only_first_orders_for');
    table.dropColumn('first_orders_redemption_limit');
  });
