const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('payment_service_logs', table => {
      table.uuid('id').primary();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table.string('payment_service', 20).index();
      table.string('order_type').index();
      table.uuid('reference_order_id').index();
      table.string('request_type');
      table.jsonb('request');
      table.jsonb('response');
      table
        .integer('response_time')
        .defaultTo(0)
        .comment('in milliseconds');
    })
    .then(() => knex.raw(onUpdateTrigger('payment_service_logs')));

exports.down = knex => knex.schema.dropTable('payment_service_logs');
