exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.string('src_platform');
    table.string('src_platform_version');
  });

exports.down = knex =>
  knex.schema.table('order_sets', table => {
    table.dropColumn('src_platform');
    table.dropColumn('src_platform_version');
  });
