exports.up = knex =>
  knex.schema.dropTable('customer_brand_reward_program_tiers');

exports.down = knex =>
  knex.schema.createTable('customer_brand_reward_program_tiers', table => {
    table.uuid('id').primary();
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable();
    table
      .uuid('brand_reward_program_tier_id')
      .references('id')
      .inTable('brand_reward_program_tiers')
      .index()
      .notNullable();
    table.datetime('reached_at');
    table.integer('status').default(0);
  });
