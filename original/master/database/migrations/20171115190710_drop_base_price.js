exports.up = knex =>
  knex.schema
    .alterTable('menu_items', table => {
      table.dropColumn('base_price');
    })
    .alterTable('order_items', table => {
      table.dropColumn('base_price');
    });

exports.down = knex =>
  knex.schema
    .alterTable('menu_items', table => {
      table.specificType('base_price', 'numeric(13, 3)');
    })
    .alterTable('order_items', table => {
      table.specificType('base_price', 'numeric(13, 3)');
    });
