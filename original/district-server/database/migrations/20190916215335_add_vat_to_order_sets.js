exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table
      .specificType('vat', 'numeric(5, 2)')
      .defaultTo(0)
      .comment('percentage');
  });

exports.down = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.dropColumn('vat');
  });
