exports.up = function (knex) {
    return knex.schema.alterTable('reward_tier_perks', table => {
      table.float('discount_limit').default(0);
    })
  };
  
  exports.down = knex =>
    knex.schema.table('reward_tier_perks', table => {
      table.dropColumn('discount_limit');
    });