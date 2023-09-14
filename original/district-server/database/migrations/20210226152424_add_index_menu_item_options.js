exports.up = async knex => {
  await knex.schema.table('menu_item_options', table => {
    table.index(
      'menu_item_option_set_id',
      'idx-menu_item_options-menu_item_option_set_id'
    );
    table.index('sort_order', 'idx-menu_item_options-sort_order');
  });
};

exports.down = async knex => {
  await knex.schema.table('menu_item_options', table => {
    table.dropIndex(
      'menu_item_option_set_id',
      'idx-menu_item_options-menu_item_option_set_id'
    );
    table.dropIndex('sort_order', 'idx-menu_item_options-sort_order');
  });
};
