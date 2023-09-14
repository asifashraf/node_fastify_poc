exports.up = knex =>
  knex.schema
    .alterTable('order_items', table => {
      table.dropForeign('menu_item_id');
    })
    .alterTable('order_item_options', table => {
      table.dropForeign('menu_item_option_id');
    })
    .raw(`ALTER TABLE order_items ALTER COLUMN menu_item_id DROP NOT NULL;`)
    .raw(
      `ALTER TABLE order_item_options ALTER COLUMN menu_item_option_id DROP NOT NULL;`
    );

exports.down = knex =>
  knex.schema
    .alterTable('order_items', table => {
      table
        .foreign('menu_item_id')
        .references('id')
        .inTable('menu_items');
    })
    .alterTable('order_item_options', table => {
      table
        .foreign('menu_item_option_id')
        .references('id')
        .inTable('menu_item_options');
    })
    .raw(`ALTER TABLE order_items ALTER COLUMN menu_item_id SET NOT NULL;`)
    .raw(
      `ALTER TABLE order_item_options ALTER COLUMN menu_item_option_id SET NOT NULL;`
    );
