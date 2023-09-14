exports.up = knex =>
  knex.schema.alterTable('countries', table => {
    table
      .specificType('minimum_delivery_order_amount', 'numeric(13, 3)')
      .defaultTo(0);
  });

exports.down = knex =>
  knex.schema.table('countries', table => {
    table.dropColumn('minimum_delivery_order_amount');
  });
