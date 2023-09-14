exports.up = knex =>
  knex.schema.table('menu_items', table => {
    table.string('item_description');
  });

exports.down = knex =>
  knex.schema.table('menu_items', table => {
    table.dropColumn('item_description');
  });
