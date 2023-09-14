exports.up = knex =>
  knex.schema.table('weekly_schedules', table => {
    table
      .integer('delivery_time_offset')
      .default(0)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('weekly_schedules', table => {
    table.dropColumn('delivery_time_offset');
  });
