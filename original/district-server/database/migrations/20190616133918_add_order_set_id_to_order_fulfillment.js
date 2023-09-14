exports.up = knex =>
  knex.schema.table('order_fulfillment', table =>
    table
      .uuid('order_set_id')
      .references('id')
      .inTable('order_sets')
      .index()
  );

exports.down = knex =>
  knex.schema.table('order_fulfillment', table =>
    table.dropColumn('order_set_id')
  );
