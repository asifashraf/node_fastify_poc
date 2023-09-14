const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex => {
  return knex.schema
    .createTable('blog_category', table => {
      table.uuid('id').primary();
      table.string('name', 255).notNullable();
      table.string('permalink', 255).notNullable();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .string('status', 32)
        .notNullable()
        .defaultTo('ACTIVE');
    })
    .then(() => knex.raw(onUpdateTrigger('blog_category')));
};

exports.down = knex => {
  return knex.schema.dropTable('blog_category');
};
