exports.up = knex =>
  knex.schema.alterTable('store_order_sets', table => {
    table.specificType('amount_due', 'numeric(13, 3)').default(0.0);
  });

exports.down = knex =>
  knex.schema.alterTable('store_order_sets', table => {
    table.dropColumn('amount_due');
  });
