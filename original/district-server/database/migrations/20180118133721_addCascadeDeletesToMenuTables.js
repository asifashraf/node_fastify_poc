exports.up = knex =>
  knex.schema
    .alterTable('menu_item_option_sets', table => {
      table.dropForeign('menu_item_id');
      table
        .foreign('menu_item_id')
        .references('id')
        .inTable('menu_items')
        .onDelete('CASCADE');
    })
    .alterTable('menu_item_options', table => {
      table.dropForeign('menu_item_option_set_id');
      table
        .foreign('menu_item_option_set_id')
        .references('id')
        .inTable('menu_item_option_sets')
        .onDelete('CASCADE');
    })
    .alterTable('menu_sections', table => {
      table.dropForeign('menu_id');
      table
        .foreign('menu_id')
        .references('id')
        .inTable('menus')
        .onDelete('CASCADE');
    })
    .alterTable('menu_items', table => {
      table.dropForeign('section_id');
      table
        .foreign('section_id')
        .references('id')
        .inTable('menu_sections')
        .onDelete('CASCADE');
    });

exports.down = knex =>
  knex.schema
    .alterTable('menu_item_option_sets', table => {
      table.dropForeign('menu_item_id');
      table
        .foreign('menu_item_id')
        .references('id')
        .inTable('menu_items');
    })
    .alterTable('menu_item_options', table => {
      table.dropForeign('menu_item_option_set_id');
      table
        .foreign('menu_item_option_set_id')
        .references('id')
        .inTable('menu_item_option_sets');
    })
    .alterTable('menu_sections', table => {
      table.dropForeign('menu_id');
      table
        .foreign('menu_id')
        .references('id')
        .inTable('menus');
    })
    .alterTable('menu_items', table => {
      table.dropForeign('section_id');
      table
        .foreign('section_id')
        .references('id')
        .inTable('menu_sections');
    });
