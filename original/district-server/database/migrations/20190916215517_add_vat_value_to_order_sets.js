exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.specificType('total_vat', 'numeric(13, 3)').defaultTo(0);
  });

exports.down = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.dropColumn('total_vat');
  });
