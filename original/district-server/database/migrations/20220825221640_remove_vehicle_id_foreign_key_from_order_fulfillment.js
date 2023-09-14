exports.up = async (knex, Promise) => {
  return knex.schema.table('order_fulfillment', function(table) {
    table.dropForeign('vehicle_id');
  });
};

exports.down = async () => {};
