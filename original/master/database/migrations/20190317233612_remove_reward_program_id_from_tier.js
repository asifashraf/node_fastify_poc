exports.up = knex =>
  knex.schema.table('brand_reward_program_tiers', table =>
    table.dropColumn('brand_reward_program_id')
  );

exports.down = knex =>
  knex.schema.table(
    'brand_reward_program_tiers',
    table =>
      table
        .uuid('brand_reward_program_id')
        .references('id')
        .inTable('brand_reward_programs')
        .index()
        .notNullable()
    // table.dropColumn('brand_reward_program_id')
  );
