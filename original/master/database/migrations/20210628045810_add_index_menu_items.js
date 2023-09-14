exports.up = async knex => {
  await knex.schema.table('menu_items', table => {
    table.index('section_id', 'idx-menu_items-section_id');
    table.index('sort_order', 'idx-menu_items-sort_order');
  });
};

exports.down = async knex => {
  await knex.schema.table('menu_items', table => {
    table.dropIndex('section_id', 'idx-menu_items-section_id');
    table.dropIndex('sort_order', 'idx-menu_items-sort_order');
  });
};
