exports.up = knex =>
  knex.schema.table('brand_reward_program_tiers', table =>
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index()
      .notNullable()
  );

exports.down = knex =>
  knex.schema.table('brand_reward_program_tiers', table =>
    table.dropColumn('brand_id')
  );
