exports.up = knex =>
  knex.schema.alterTable('schedule_exceptions', table => {
    table.boolean('is_delivery_closed');
  });

exports.down = knex =>
  knex.schema.table('schedule_exceptions', table => {
    table.dropColumn('is_delivery_closed');
  });
