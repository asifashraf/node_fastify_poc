exports.up = knex =>
  knex.schema.table('reward_tiers', table =>
    table.integer('sort_order').defaultTo(1)
  );

exports.down = knex =>
  knex.schema.table('reward_tiers', table => table.dropColumn('sort_order'));
