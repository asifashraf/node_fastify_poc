exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.specificType('min_applicable_limit', 'numeric(13, 3)').default(0);
  });

exports.down = knex =>
  knex.schema.table('coupons', table => {
    table.dropColumn('min_applicable_limit');
  });
