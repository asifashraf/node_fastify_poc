exports.up = knex =>
  knex.schema.table('customer_tiers', table => {
    table
      .uuid('reward_id')
      .references('id')
      .inTable('rewards')
      .index()
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('customer_tiers', table => {
    table.dropColumn('reward_id');
  });
