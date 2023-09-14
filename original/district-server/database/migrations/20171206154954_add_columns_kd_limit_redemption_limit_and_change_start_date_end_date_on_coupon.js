exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.timestamp('start_date').alter();
    table.timestamp('end_date').alter();
    table.integer('kd_limit');
    table.integer('redemption_count');
    table.integer('redemption_limit');
  });

exports.down = knex =>
  knex.schema.alterTable('coupons', table => {
    table.date('start_date').alter();
    table.date('end_date').alter();
    table.dropColumn('kd_limit');
    table.dropColumn('redemption_count');
    table.dropColumn('redemption_limit');
  });
