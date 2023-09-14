exports.up = knex =>
  knex.schema.alterTable('menu_item_options', table => {
    table.string('pos_id');
  });

exports.down = knex =>
  knex.schema.table('menu_item_options', table => {
    table.dropColumn('pos_id');
  });
