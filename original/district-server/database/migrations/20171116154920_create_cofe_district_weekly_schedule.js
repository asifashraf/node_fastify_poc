exports.up = knex =>
  knex.schema.createTable('cofe_district_weekly_schedule', table => {
    table.uuid('id').primary();
    table.integer('day').notNullable();
    table.time('openTime');
    table.integer('openDuration');
    table
      .boolean('openAllDay')
      .default(false)
      .notNullable();
  });

exports.down = knex => knex.schema.dropTable('cofe_district_weekly_schedule');
