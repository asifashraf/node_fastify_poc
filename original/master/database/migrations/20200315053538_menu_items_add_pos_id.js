exports.up = knex =>
  knex.schema.alterTable('menu_items', table => {
    table.string('pos_id');
  });

exports.down = knex =>
  knex.schema.table('menu_items', table => {
    table.dropColumn('pos_id');
  });
