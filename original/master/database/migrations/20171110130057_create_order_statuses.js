exports.up = knex =>
  knex.schema.createTable('order_statuses', table => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.datetime('time').notNullable();
    table
      .uuid('order_id')
      .references('id')
      .inTable('orders')
      .index()
      .notNullable();
    table.string('rejection_reason');
    table.string('note');
  });

exports.down = knex => knex.schema.dropTable('order_statuses');
