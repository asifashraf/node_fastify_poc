exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.specificType('reward_amount', 'numeric(13, 3)').after('coupon_id');
  });

exports.down = knex =>
  knex.schema.table('order_sets', table => {
    table.dropColumn('reward_amount');
  });
