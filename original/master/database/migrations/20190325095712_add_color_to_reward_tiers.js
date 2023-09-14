exports.up = knex =>
  knex.schema.table('reward_tiers', table => {
    table.string('color', 32).defaultTo(null);
  });

exports.down = knex =>
  knex.schema.table('reward_tiers', table => {
    table.dropColumn('color');
  });
