exports.up = knex =>
  knex.schema.table('inventories', table => {
    table.dropColumn('sku');
    table.dropColumn('barcode');
  });

exports.down = knex =>
  knex.schema.alterTable('inventories', table => {
    table.string('sku').index();
    table.string('barcode').index();
  });
