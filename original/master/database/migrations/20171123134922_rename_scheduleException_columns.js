exports.up = knex =>
  knex.schema.table('schedule_exceptions', table => {
    // table.renameColumn('startTime', 'start_time');
    // table.renameColumn('endTime', 'end_time');
  });

exports.down = knex =>
  knex.schema.table('weekly_schedules', table => {
    // table.renameColumn('start_time', 'startTime');
    // table.renameColumn('end_time', 'endTime');
  });
