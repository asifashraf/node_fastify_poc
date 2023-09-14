const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex => {
  return knex.schema
    .createTable('blog_post', table => {
      table.uuid('id').primary();
      table.string('title', 500).notNullable();
      table.text('description').notNullable();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table.string('author', 255).notNullable();
      table
        .uuid('category_id')
        .references('id')
        .inTable('blog_category')
        .notNullable();
      table.string('meta_title', 500).notNullable();
      table.text('meta_description').notNullable();
      table.string('meta_tags', 500).notNullable();
      table
        .string('status', 32)
        .notNullable()
        .defaultTo('ACTIVE');
    })
    .then(() => knex.raw(onUpdateTrigger('blog_post')));
};

exports.down = knex => {
  return knex.schema.dropTable('blog_post');
};
