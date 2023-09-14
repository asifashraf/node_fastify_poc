const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('tracking_infos', table => {
      table.uuid('id').primary();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table.string('order_type', 100).index();
      table.string('reference_id', 100).index();
      table.string('carrier_name');
      table.string('carrier_tracking_id');
      table.string('carrier_tracking_url');
    })
    .then(() => knex.raw(onUpdateTrigger('tracking_infos')));

exports.down = knex => knex.schema.dropTable('tracking_infos');
