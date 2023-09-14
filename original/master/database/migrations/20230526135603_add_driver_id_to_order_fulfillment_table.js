
exports.up = function (knex) {
  return knex.schema.alterTable('order_fulfillment', table => {
    table.uuid('driver_id')
      .references('id')
      .inTable('drivers')
      .index()
      .nullable();
  })
};
  
exports.down = knex =>
  knex.schema.table('order_fulfillment', table => {
    table.dropColumn('driver_id');
});