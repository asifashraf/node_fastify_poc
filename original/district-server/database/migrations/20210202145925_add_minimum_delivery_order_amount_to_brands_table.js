exports.up = knex =>
  knex.schema.alterTable('brands', table => {
    table
      .specificType('minimum_delivery_order_amount', 'numeric(13, 3)')
      .defaultTo(0);
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('minimum_delivery_order_amount');
  });
