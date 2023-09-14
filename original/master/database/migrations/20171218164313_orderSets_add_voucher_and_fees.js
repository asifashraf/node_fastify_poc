exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.specificType('fees', 'numeric(13, 3)');
    table.specificType('voucher', 'numeric(13, 3)');
  });

exports.down = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.dropColumn('fees');
    table.dropColumn('voucher');
  });
