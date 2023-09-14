exports.up = async knex => {
  await knex.schema.alterTable('menu_item_options', table => {
    table.specificType('compare_at_price', 'numeric(13, 3)');
  });
};

exports.down = async knex => {
  await knex.schema.alterTable('menu_item_options', table => {
    table.dropColumn('compare_at_price');
  });
};
