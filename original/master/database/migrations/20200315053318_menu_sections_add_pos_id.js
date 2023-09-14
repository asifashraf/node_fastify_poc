exports.up = knex =>
  knex.schema.alterTable('menu_sections', table => {
    table.string('pos_id');
  });

exports.down = knex =>
  knex.schema.table('menu_sections', table => {
    table.dropColumn('pos_id');
  });
