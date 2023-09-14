exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.boolean('only_first_orders').defaultsTo(false);
  });

exports.down = knex =>
  knex.schema.alterTable('coupons', table => {
    table.dropColumn('only_first_orders');
  });
