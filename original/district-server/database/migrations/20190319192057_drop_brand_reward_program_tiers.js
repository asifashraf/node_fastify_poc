exports.up = knex => knex.schema.dropTable('brand_reward_program_tiers');

exports.down = knex =>
  knex.schema.createTable('brand_reward_program_tiers', table => {
    table.uuid('id').primary();
    table
      .uuid('brand_reward_program_id')
      .references('id')
      .inTable('brand_reward_programs')
      .index()
      .notNullable();
    table.string('title').notNullable();
    table.string('logo_url').notNullable();
    table.integer('alter_count').default(0);
    table.datetime('last_altered_at');
    table.float('activate_at_points').notNullable();
  });
