exports.up = knex =>
  knex.schema.alterTable('countries', table => {
    table.boolean('is_referral_active').defaultTo(true);
  });

exports.down = knex =>
  knex.schema.table('countries', table => {
    table.dropColumn('is_referral_active');
  });
