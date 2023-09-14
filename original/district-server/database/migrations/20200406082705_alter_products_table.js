exports.up = knex =>
  knex.schema.table('products', table => {
    table.renameColumn('list_price', 'price');
    table.renameColumn('on_sale_price', 'compare_at_price');
    table.specificType('cost_per_item', 'numeric(13,3)').default(0);
  });

exports.down = knex =>
  knex.schema.alterTable('products', table => {
    table.renameColumn('price', 'list_price');
    table.renameColumn('compare_at_price', 'on_sale_price');
    table.dropColumn('cost_per_item');
  });
