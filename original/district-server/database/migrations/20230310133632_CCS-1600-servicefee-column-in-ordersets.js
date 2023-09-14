exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.specificType('service_fee_amount', 'numeric(13, 3)').defaultTo(0);
  });

exports.down = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.dropColumn('service_fee_amount');
  });
