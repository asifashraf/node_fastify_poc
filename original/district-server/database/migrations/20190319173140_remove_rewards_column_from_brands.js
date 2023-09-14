exports.up = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('reward_program_title');
    table.dropColumn('reward_program_conversation_rate');
    table.dropColumn('reward_program_tier_limit');
    table.dropColumn('reward_program_tier_unalterable_till_days');
    table.dropColumn('activate_reward_program');
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.string('reward_program_title');
    table.float('reward_program_conversation_rate');
    table.integer('reward_program_tier_limit').default(1);
    table.integer('reward_program_tier_unalterable_till_days').default(1);
    table.boolean('activate_reward_program').default(false);
  });
