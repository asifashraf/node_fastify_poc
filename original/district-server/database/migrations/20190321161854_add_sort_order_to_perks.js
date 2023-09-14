exports.up = knex =>
  knex.schema.table('reward_tier_perks', table =>
    table.integer('sort_order').defaultTo(1)
  );

exports.down = knex =>
  knex.schema.table('reward_tier_perks', table =>
    table.dropColumn('sort_order')
  );
