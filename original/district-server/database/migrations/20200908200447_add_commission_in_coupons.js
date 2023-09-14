exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.specificType('commission', 'numeric(13, 3)').default(0.0);
  });

exports.down = knex =>
  knex.schema.alterTable('coupons', table => {
    table.dropColumn('commission');
  });
