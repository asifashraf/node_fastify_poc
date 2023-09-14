exports.up = knex =>
  knex.schema.table('order_sets', table =>
    table.boolean('cash_on_delivery').defaultTo(false)
  );

exports.down = knex =>
  knex.schema.table('order_sets', table =>
    table.dropColumn('cash_on_delivery')
  );
