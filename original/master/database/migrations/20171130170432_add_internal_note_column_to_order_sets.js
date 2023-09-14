exports.up = knex =>
  knex.schema.table('order_sets', table => {
    table.string('internal_note', 4096);
  });

exports.down = knex =>
  knex.schema.table('order_sets', table => {
    table.dropColumn('internal_note');
  });
