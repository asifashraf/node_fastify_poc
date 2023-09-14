exports.up = knex =>
  knex.schema
    .table('cofe_district_weekly_schedule', table => {
      table.renameColumn('openTime', 'open_time');
      table.renameColumn('openDuration', 'open_duration');
      table.renameColumn('openAllDay', 'open_all_day');
      table
        .integer('day')
        .notNullable()
        .unique()
        .alter();
    })
    .raw(
      `ALTER TABLE cofe_district_weekly_schedule ADD CONSTRAINT day_validity_check CHECK ( day >= 1 AND day <= 7);`
    );

exports.down = knex =>
  knex.schema
    .table('cofe_district_weekly_schedule', table => {
      table.renameColumn('open_time', 'openTime');
      table.renameColumn('open_duration', 'openDuration');
      table.renameColumn('open_all_day', 'openAllDay');
      table
        .integer('day')
        .notNullable()
        .alter();
    })
    .raw(
      `ALTER TABLE cofe_district_weekly_schedule DROP CONSTRAINT day_validity_check;`
    );
