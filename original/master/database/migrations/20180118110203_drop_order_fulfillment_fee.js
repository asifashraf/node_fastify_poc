exports.up = knex =>
  knex.schema.table('order_fulfillment', table => {
    table.dropColumn('fee');
  });

exports.down = knex =>
  knex.schema.table('order_fulfillment', table => {
    table.specificType('fee', 'numeric(13,3)');
  });
