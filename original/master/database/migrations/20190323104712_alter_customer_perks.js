exports.up = knex =>
  knex.schema.table('customer_perks', table => {
    table.dropColumn('reward_tier_perk_id');
    table
      .string('type')
      .notNullable()
      .index();
  });

exports.down = knex =>
  knex.schema.table('customer_perks', table => {
    table
      .uuid('reward_tier_perk_id')
      .references('id')
      .inTable('reward_tier_perks')
      .index()
      .notNullable();
    table.dropColumn('type');
  });
