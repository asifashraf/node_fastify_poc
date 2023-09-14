exports.up = knex =>
  knex.schema.table('cofe_district_weekly_schedule', table => {
    table
      .integer('delivery_time_offset')
      .default(0)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('cofe_district_weekly_schedule', table => {
    table.dropColumn('delivery_time_offset');
  });
