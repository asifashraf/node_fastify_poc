exports.up = knex =>
  knex.schema.alterTable('customers', table => {
    table
      .boolean('referral_reward_availed')
      .defaultsTo(0)
      .nullable();
  });

exports.down = knex =>
  knex.schema.alterTable('customers', table => {
    table.dropColumn('referral_reward_availed');
  });
