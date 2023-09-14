exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.string('receipt_url', 1024);
    table.string('error_url', 1024);
  });

exports.down = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.dropColumn('receipt_url');
    table.dropColumn('error_url');
  });
