exports.up = knex =>
  knex.schema.table('brands', table => {
    table.decimal('minimum_order_amount', 13, 3).defaultTo(0);
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('minimum_order_amount');
  });
