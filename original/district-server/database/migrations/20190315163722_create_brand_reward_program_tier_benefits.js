exports.up = knex =>
  knex.schema.createTable('brand_reward_program_tier_benefits', table => {
    table.uuid('id').primary();
    table
      .uuid('brand_reward_program_tier_id')
      .references('id')
      .inTable('brand_reward_program_tiers')
      .index()
      .notNullable();
    table
      .uuid('reward_program_benefit_id')
      .references('id')
      .inTable('reward_program_benefits')
      .index()
      .notNullable();
    table
      .uuid('reference_reward_program_benefit_id')
      .references('id')
      .inTable('reward_program_benefits')
      .index();
    table.integer('value_int').notNullable();
    table.float('value_float').notNullable();
  });

exports.down = knex =>
  knex.schema.dropTable('brand_reward_program_tier_benefits');
