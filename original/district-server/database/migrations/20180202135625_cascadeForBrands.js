exports.up = knex =>
  knex.schema
    .alterTable('brand_locations', table => {
      table.dropForeign('brand_id');
      table
        .foreign('brand_id')
        .references('id')
        .inTable('brands')
        .onDelete('CASCADE');
    })
    .alterTable('menus', table => {
      table.dropForeign('brand_id');
      table
        .foreign('brand_id')
        .references('id')
        .inTable('brands')
        .onDelete('CASCADE');
    })
    .alterTable('weekly_schedules', table => {
      table.dropForeign('brand_location_id');
      table
        .foreign('brand_location_id')
        .references('id')
        .inTable('brand_locations')
        .onDelete('CASCADE');
    })
    .alterTable('schedule_exceptions', table => {
      table.dropForeign('brand_location_id');
      table
        .foreign('brand_location_id')
        .references('id')
        .inTable('brand_locations')
        .onDelete('CASCADE');
    })
    .alterTable('order_sets', table => {
      table.dropForeign('brand_location_id');
      table
        .foreign('brand_location_id')
        .references('id')
        .inTable('brand_locations')
        .onDelete('CASCADE');
    })
    .alterTable('order_set_statuses', table => {
      table.dropForeign('order_set_id');
      table
        .foreign('order_set_id')
        .references('id')
        .inTable('order_sets')
        .onDelete('CASCADE');
    })
    .alterTable('payment_statuses', table => {
      table.dropForeign('order_set_id');
      table
        .foreign('order_set_id')
        .references('id')
        .inTable('order_sets')
        .onDelete('CASCADE');
    })
    .alterTable('order_items', table => {
      table.dropForeign('order_set_id');
      table
        .foreign('order_set_id')
        .references('id')
        .inTable('order_sets')
        .onDelete('CASCADE');
    })
    .alterTable('orders', table => {
      table.dropForeign('order_set_id');
      table
        .foreign('order_set_id')
        .references('id')
        .inTable('order_sets')
        .onDelete('CASCADE');
    })
    .alterTable('order_items', table => {
      table.dropForeign('order_set_id');
      table
        .foreign('order_set_id')
        .references('id')
        .inTable('order_sets')
        .onDelete('CASCADE');
    })
    .alterTable('order_item_options', table => {
      table.dropForeign('order_item_id');
      table
        .foreign('order_item_id')
        .references('id')
        .inTable('order_items')
        .onDelete('CASCADE');
    })
    .alterTable('order_statuses', table => {
      table.dropForeign('order_id');
      table
        .foreign('order_id')
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE');
    })
    .alterTable('order_fulfillment', table => {
      table.dropForeign('order_id');
      table
        .foreign('order_id')
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE');
    })
    .alterTable('delivery_addresses', table => {
      table.dropForeign('order_fulfillment_id');
      table
        .foreign('order_fulfillment_id')
        .references('id')
        .inTable('order_fulfillment')
        .onDelete('CASCADE');
    });

exports.down = knex => {};
