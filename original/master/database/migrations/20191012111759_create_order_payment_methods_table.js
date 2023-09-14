const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('order_payment_methods', table => {
      table.uuid('id').primary();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table.string('order_type').index();
      table.uuid('reference_order_id').index();
      table.string('payment_service', 20).index();
      table.jsonb('payment_method');
    })
    .then(() => knex.raw(onUpdateTrigger('order_payment_methods')));

exports.down = knex => knex.schema.dropTable('order_payment_methods');
