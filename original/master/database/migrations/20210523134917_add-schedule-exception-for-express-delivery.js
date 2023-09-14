exports.up = knex =>
  knex.schema.alterTable('schedule_exceptions', table => {
    table.boolean('is_express_delivery_closed').default(false);
  });

exports.down = knex =>
  knex.schema.table('schedule_exceptions', table => {
    table.dropColumn('is_express_delivery_closed');
  });
