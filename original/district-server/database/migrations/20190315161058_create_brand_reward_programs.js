exports.up = knex =>
  knex.schema.createTable('brand_reward_programs', table => {
    table.uuid('id').primary();
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index()
      .notNullable();
    table.string('title').notNullable();
    table.float('conversation_rate');
    table.integer('tier_limit').default(1);
    table.integer('tier_unalterable_till_days').default(1);
  });

exports.down = knex => knex.schema.dropTable('brand_reward_programs');
