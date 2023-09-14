exports.up = knex =>
  knex.schema.alterTable('user_activity_logs', table => {
    table.string('src_platform_version').nullable();
  });

exports.down = knex =>
  knex.schema.table('src_platform_version', table => {
    table.dropColumn('src_platform_version');
  });
