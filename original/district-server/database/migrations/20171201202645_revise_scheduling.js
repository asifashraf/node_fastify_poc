exports.up = knex =>
  knex.schema
    .table('brand_locations', table => {
      table
        .string('time_zone_identifier')
        .notNullable()
        .default('Asia/Kuwait');
    })
    .raw(
      `ALTER TABLE weekly_schedules ADD CONSTRAINT day_validity_check CHECK ( day >= 1 AND day <= 7);`
    );

exports.down = knex =>
  knex.schema
    .table('brand_locations', table => {
      table.dropColumn('time_zone_identifier');
    })
    .raw(`ALTER TABLE weekly_schedules DROP CONSTRAINT day_validity_check;`);
