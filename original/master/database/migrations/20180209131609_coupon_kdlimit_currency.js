exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.specificType('kd_limit', 'numeric(13, 3)').alter();
  });

exports.down = knex =>
  knex.schema.alterTable('coupons', table => {
    table.integer('kd_limit').alter();
  });
