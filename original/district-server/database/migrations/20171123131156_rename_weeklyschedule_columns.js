exports.up = knex =>
  knex.schema.table('weekly_schedules', table => {
    table.renameColumn('openTime', 'open_time');
    table.renameColumn('openDuration', 'open_duration');
    table.renameColumn('openAllDay', 'open_all_day');
  });

exports.down = knex =>
  knex.schema.table('weekly_schedules', table => {
    table.renameColumn('open_time', 'openTime');
    table.renameColumn('open_duration', 'openDuration');
    table.renameColumn('open_all_day', 'openAllDay');
  });
