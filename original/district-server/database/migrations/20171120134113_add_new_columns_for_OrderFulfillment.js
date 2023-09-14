exports.up = knex =>
  knex.schema.table('order_fulfillment', table => {
    table
      .boolean('deliver_to_vehicle')
      .default(false)
      .notNullable();
    table.string('vehicle_color');
    table.string('vehicle_description');
  });

exports.down = knex =>
  knex.schema.table('order_fulfillment', table => {
    table.dropColumn('deliver_to_vehicle');
    table.dropColumn('vehicle_color');
    table.dropColumn('vehicle_description');
  });
