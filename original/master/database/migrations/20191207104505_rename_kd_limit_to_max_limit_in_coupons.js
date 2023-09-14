exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.renameColumn('kd_limit', 'max_limit');
  });

exports.down = knex =>
  knex.schema.table('coupons', table => {
    table.renameColumn('max_limit', 'kd_limit');
  });
