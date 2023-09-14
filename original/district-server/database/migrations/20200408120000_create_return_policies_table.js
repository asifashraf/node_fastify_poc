const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('return_policies', table => {
      table.uuid('id').primary();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .uuid('product_id')
        .references('id')
        .inTable('products');
      table.string('name');
      table.boolean('returnable').default(false);
      table.string('description');
      table.string('description_ar');
      table.integer('return_time_frame').comment('in days');
    })
    .then(() => knex.raw(onUpdateTrigger('return_policies')));

exports.down = knex => knex.schema.dropTable('return_policies');
