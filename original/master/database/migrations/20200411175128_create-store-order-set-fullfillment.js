const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema.createTable('store_order_set_fulfillment', table => {
    table.uuid('id').primary();
    table.string('type').notNullable();
    table.datetime('time').index();
    table
      .specificType('fee', 'numeric(13, 3)')
      .default(0)
      .notNullable();
    table.text('note');
    table.jsonb('delivery_address');
    table.string('courier_name');
    table
      .uuid('store_order_set_id')
      .references('id')
      .inTable('store_order_sets');
    table.boolean('asap').default(false);
    table.integer('courier_order_id').default(0);
    table.integer('delivery_estimate').default(0);
    table.string('delivery_status');
    table.datetime('last_updated');
    table.datetime('delivered_at');
    table
      .boolean('deliver_to_vehicle')
      .default(false)
      .notNullable();
    table.string('vehicle_color');
    table.string('vehicle_description');
    table
      .boolean('is_customer_present')
      .default(false)
      .notNullable();
  });

exports.down = knex => knex.schema.dropTable('store_order_set_fulfillment');
