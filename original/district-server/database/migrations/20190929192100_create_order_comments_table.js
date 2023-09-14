exports.up = knex =>
  knex.schema.createTable('order_comments', table => {
    table.uuid('id').primary();
    table
      .timestamp('created')
      .notNullable()
      .defaultTo(knex.fn.now());
    table.string('comment', 1000);
    table
      .uuid('order_set_id')
      .references('id')
      .inTable('order_sets')
      .index();
    table.string('user_name');
    table.string('avatar');
  });

exports.down = knex => knex.schema.dropTable('order_comments');
