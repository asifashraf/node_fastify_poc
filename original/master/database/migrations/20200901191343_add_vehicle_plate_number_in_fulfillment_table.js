exports.up = knex =>
  knex.schema.alterTable('order_fulfillment', table => {
    table
      .string('vehicle_plate_number')
      .defaultsTo('')
      .nullable();
  });

exports.down = knex =>
  knex.schema.alterTable('order_fulfillment', table => {
    table.dropColumn('vehicle_plate_number');
  });
