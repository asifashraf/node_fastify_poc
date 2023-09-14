exports.up = knex =>
  knex.schema.table('order_fulfillment', table => {
    table.dropForeign('vehicle_id');
  });

exports.down = knex =>
  knex.schema.table('order_fulfillment', table => {
    table
      .foreign('vehicle_id')
      .references('id')
      .inTable('customer_cars');
  });

