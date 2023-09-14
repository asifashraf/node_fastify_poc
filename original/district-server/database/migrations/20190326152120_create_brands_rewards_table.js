exports.up = knex =>
  knex.schema.createTable('brands_rewards', table => {
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index()
      .notNullable();
    table
      .uuid('reward_id')
      .references('id')
      .inTable('rewards')
      .index()
      .notNullable();
    table.primary(['brand_id', 'reward_id']);
  });

exports.down = knex => knex.schema.dropTable('brands_rewards');
