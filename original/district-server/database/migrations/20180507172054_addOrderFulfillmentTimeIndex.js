exports.up = knex =>
  knex.schema.alterTable('order_fulfillment', table => {
    table.index(['time']);
  });

exports.down = knex =>
  knex.schema.alterTable('order_fulfillment', table => {
    table.dropIndex(['time']);
  });
