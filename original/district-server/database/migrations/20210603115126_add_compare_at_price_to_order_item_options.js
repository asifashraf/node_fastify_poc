exports.up = knex =>
  knex.schema.alterTable('order_item_options', table => {
    table.specificType('compare_at_price', 'numeric(13, 3)');
  });

exports.down = knex =>
  knex.schema.alterTable('order_item_options', table => {
    table.dropColumn('compare_at_price');
  });
