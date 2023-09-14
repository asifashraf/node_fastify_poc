exports.up = knex =>
  knex.schema.alterTable('countries', table => {
    table.integer('store_order_delivery_time').nullable();
  });

exports.down = knex =>
  knex.schema.alterTable('countries', table => {
    table.dropColumn('store_order_delivery_time');
  });
