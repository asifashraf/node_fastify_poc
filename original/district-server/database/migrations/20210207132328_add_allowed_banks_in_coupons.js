exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.specificType('allowed_banks', 'text ARRAY');
  });

exports.down = knex =>
  knex.schema.alterTable('coupons', table => {
    table.dropColumn('allowed_banks');
  });
