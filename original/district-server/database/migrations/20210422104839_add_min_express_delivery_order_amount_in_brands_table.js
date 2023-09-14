exports.up = knex =>
  knex.schema.alterTable('brands', table => {
    table
      .specificType('minimum_express_delivery_order_amount', 'numeric(13, 3)')
      .defaultTo(0);
  });

exports.down = knex =>
  knex.schema.alterTable('brands', table => {
    table.dropColumn('minimum_express_delivery_order_amount');
  });
