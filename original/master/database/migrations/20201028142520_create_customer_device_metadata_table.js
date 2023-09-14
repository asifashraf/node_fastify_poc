const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex => {
  return knex.schema
    .createTable('customer_device_metadata', table => {
      table
        .uuid('id')
        .primary();
      table
        .string('customer_id')
        .index()
        .references('id')
        .inTable('customers')
        .onDelete('CASCADE')
      table
        .string('device_identifier_type', 32)
        .notNullable()
      table
        .string('device_id', 128)
        .notNullable()
        .index()
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .boolean('is_default')
        .defaultTo(false)
        .notNullable();
      table
        .string('status', 32)
        .notNullable()
        .defaultTo('ACTIVE');
      table
        .string('version', 16)
        .defaultTo(null);
    }).then(() => knex.raw(onUpdateTrigger('customer_device_metadata')));
};

exports.down = knex => {
  return knex.schema.dropTable('customer_device_metadata');
};
