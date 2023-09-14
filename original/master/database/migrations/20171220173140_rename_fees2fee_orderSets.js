exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.renameColumn('fees', 'fee');
  });

exports.down = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.renameColumn('fee', 'fees');
  });
