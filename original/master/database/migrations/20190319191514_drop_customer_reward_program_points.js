exports.up = knex => knex.schema.dropTable('customer_reward_program_points');

exports.down = knex =>
  knex.schema.createTable('customer_reward_program_points', table => {
    table.uuid('id').primary();
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable();
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index()
      .notNullable();
    table.float('added_at_conversion_rate');
    table.float('points').notNullable();
    table.datetime('added_at').notNullable();
    table.string('status');
    table.string('src');
    table
      .uuid('order_id')
      .references('id')
      .inTable('orders')
      .index();
    table
      .uuid('brand_reward_program_tier_benefit_id')
      .references('id')
      .inTable('brand_reward_program_tier_benefits')
      .index();
  });
