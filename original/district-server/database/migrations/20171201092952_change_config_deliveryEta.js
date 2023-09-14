exports.up = knex =>
  knex.schema.table('configuration', table => {
    table.dropColumn('estimated_delivery_time');
    table.integer('delivery_window_min').notNullable();
    table.integer('delivery_window_max').notNullable();
  });

exports.down = knex =>
  knex.schema.table('configuration', table => {
    table.string('estimated_delivery_time').notNullable();
    table.dropColumn('delivery_window_min');
    table.dropColumn('delivery_window_max');
  });
