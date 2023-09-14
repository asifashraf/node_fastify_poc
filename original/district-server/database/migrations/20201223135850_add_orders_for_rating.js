exports.up = knex =>
  knex.schema.table('configuration', table => {
    table.integer('orders_required_for_rating').defaultTo(0);
  });

exports.down = knex =>
  knex.schema.table('configuration', table => {
    table.dropColumn('orders_required_for_rating');
  });
