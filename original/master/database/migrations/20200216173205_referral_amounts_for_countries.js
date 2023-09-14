exports.up = knex =>
  knex.schema.alterTable('countries', table => {
    table.string('sender_referral_amount');
    table.string('receiver_referral_amount');
  });

exports.down = knex =>
  knex.schema.table('countries', table => {
    table.dropColumn('sender_referral_amount');
    table.dropColumn('receiver_referral_amount');
  });
