exports.up = knex =>
  knex.schema.alterTable('configuration', table => {
    table.dropColumn('platform_hours_start');
    table.dropColumn('platform_hours_duration');
  });

exports.down = knex =>
  knex.schema.alterTable('configuration', table => {
    table.time('platform_hours_start');
    table.integer('platform_hours_duration');
  });
