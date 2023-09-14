exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.specificType('allowed_payment_methods', 'text ARRAY');
  });

exports.down = knex =>
  knex.schema.alterTable('coupons', table => {
    table.dropColumn('allowed_payment_methods');
  });
