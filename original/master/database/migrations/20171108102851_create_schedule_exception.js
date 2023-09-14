exports.up = knex =>
  knex.schema.createTable('schedule_exceptions', table => {
    table.uuid('id').primary();
    table.boolean('is_closed');
    table.datetime('startTime');
    table.datetime('endTime');
  });

exports.down = knex => knex.schema.dropTable('schedule_exceptions');
