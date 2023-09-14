exports.up = knex =>
  knex.schema.alterTable('weekly_schedules', table => {
    table.time('delivery_open_time');
    table.integer('delivery_open_duration');
  });

exports.down = knex =>
  knex.schema.table('weekly_schedules', table => {
    table.dropColumn('delivery_open_time');
    table.dropColumn('delivery_open_duration');
  });
