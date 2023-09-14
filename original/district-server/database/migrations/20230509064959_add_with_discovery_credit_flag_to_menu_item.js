exports.up = knex =>
  knex.schema.table('menu_items', table => {
    table.boolean('disable_discovery_credit').notNullable().defaultTo(false);
  });

exports.down = knex =>
  knex.schema.table('menu_items', table => {
    table.dropColumn('disable_discovery_credit');
  });
