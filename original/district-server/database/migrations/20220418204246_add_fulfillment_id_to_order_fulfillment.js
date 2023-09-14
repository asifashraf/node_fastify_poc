exports.up = knex =>
  knex.schema.table('order_fulfillment', table => {
    table
      .uuid('fulfillment_id')
      .nullable();
  });

exports.down = knex =>
  knex.schema.table('order_fulfillment', table => {
    table.dropColumn('fulfillment_id');
  });
