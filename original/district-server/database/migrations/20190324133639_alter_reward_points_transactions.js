exports.up = knex =>
  knex.schema.table('reward_points_transactions', table => {
    table.dropColumn('order_set_id');
    table
      .string('source_id', 100)
      .notNullable()
      .index();
  });

exports.down = knex =>
  knex.schema.table('reward_points_transactions', table => {
    table
      .uuid('order_set_id')
      .references('id')
      .inTable('order_sets')
      .index()
      .notNullable();
    table.dropColumn('source_id');
  });
