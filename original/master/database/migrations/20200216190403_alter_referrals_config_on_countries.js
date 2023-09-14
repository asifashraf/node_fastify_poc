exports.up = knex =>
  knex.schema.alterTable('countries', table => {
    table
      .specificType('sender_referral_amount', 'numeric(13, 3)')
      .defaultTo(0)
      .alter();
    table
      .specificType('receiver_referral_amount', 'numeric(13, 3)')
      .defaultTo(0)
      .alter();
  });

exports.down = knex =>
  knex.schema.alterTable('countries', table => {
    table.string('sender_referral_amount').alter();
    table.string('receiver_referral_amount').alter();
  });
