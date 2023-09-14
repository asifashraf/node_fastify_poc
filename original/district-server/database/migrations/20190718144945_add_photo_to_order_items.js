exports.up = knex =>
  knex.schema.table('order_items', table => {
    table.string('photo');
  });

exports.down = knex =>
  knex.schema.table('order_items', table => {
    table.dropColumn('photo');
  });
