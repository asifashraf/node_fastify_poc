exports.up = knex =>
  knex.schema.table('order_sets', table => {
    table.renameColumn('short_id', 'short_code');
  });

exports.down = knex =>
  knex.schema.table('order_sets', table => {
    table.renameColumn('short_code', 'short_id');
  });
