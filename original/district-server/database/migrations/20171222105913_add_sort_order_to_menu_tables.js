exports.up = knex =>
  knex.schema
    .alterTable('menu_sections', table => {
      table
        .integer('sort_order')
        .default(0)
        .notNullable();
    })
    .alterTable('menu_items', table => {
      table
        .integer('sort_order')
        .default(0)
        .notNullable();
    })
    .alterTable('menu_item_options', table => {
      table
        .integer('sort_order')
        .default(0)
        .notNullable();
    })
    .alterTable('menu_item_option_sets', table => {
      table
        .integer('sort_order')
        .default(0)
        .notNullable();
    });

exports.down = knex =>
  knex.schema
    .alterTable('menu_sections', table => {
      table.dropColumn('sort_order');
    })
    .alterTable('menu_items', table => {
      table.dropColumn('sort_order');
    })
    .alterTable('menu_item_options', table => {
      table.dropColumn('sort_order');
    })
    .alterTable('menu_item_option_sets', table => {
      table.dropColumn('sort_order');
    });
