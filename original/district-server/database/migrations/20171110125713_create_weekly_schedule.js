exports.up = knex =>
  knex.schema.createTable('weekly_schedules', table => {
    table.uuid('id').primary();
    table.integer('day').notNullable();
    table.time('openTime');
    table.integer('openDuration');
    table
      .boolean('openAllDay')
      .default(false)
      .notNullable();
  });

exports.down = knex => knex.schema.dropTable('weekly_schedules');
