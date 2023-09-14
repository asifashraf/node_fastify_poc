exports.up = knex =>
  knex.schema.table('menu_items', table => {
    table.string('type');
  });

exports.down = knex =>
  knex.schema.table('menu_items', table => {
    table.dropColumn('type');
  });
