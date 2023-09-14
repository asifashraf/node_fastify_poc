exports.up = knex =>
  knex.schema.createTable('order_set_comments', table => {
    table.uuid('id').primary();
    table
      .uuid('order_set_id')
      .references('id')
      .inTable('order_sets')
      .index();
    table.string('type').notNull();
    table.string('user_id').notNull();
    table.string('user_name').notNull();
    table.string('user_email', 256).notNull();
    table.text('comment').notNull();
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });

exports.down = knex => knex.schema.dropTable('order_set_comments');
