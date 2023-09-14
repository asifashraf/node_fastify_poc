exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.specificType('allowed_bank_cards', 'text ARRAY');
  });

exports.down = knex =>
  knex.schema.alterTable('coupons', table => {
    table.dropColumn('allowed_bank_cards');
  });
