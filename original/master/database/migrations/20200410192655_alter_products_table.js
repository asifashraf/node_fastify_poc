exports.up = knex =>
  knex.schema.table('products', table => {
    table.string('sku').index();
    table.string('barcode').index();
  });

exports.down = knex =>
  knex.schema.alterTable('products', table => {
    table.dropColumn('sku');
    table.dropColumn('barcode');
  });
