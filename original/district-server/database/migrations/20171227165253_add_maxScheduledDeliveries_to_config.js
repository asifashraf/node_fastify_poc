exports.up = knex =>
  knex.schema.table('configuration', table => {
    table.integer('max_scheduled_deliveries').default(20);
  });

exports.down = knex =>
  knex.schema.table('configuration', table => {
    table.dropColumn('max_scheduled_deliveries');
  });
