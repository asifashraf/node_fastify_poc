exports.up = knex =>
  knex.schema.alterTable('weekly_schedules', table => {
    table.time('express_delivery_open_time');
    table.integer('express_delivery_open_duration');
  });

exports.down = knex =>
  knex.schema.table('weekly_schedules', table => {
    table.dropColumn('express_delivery_open_time');
    table.dropColumn('express_delivery_open_duration');
  });
