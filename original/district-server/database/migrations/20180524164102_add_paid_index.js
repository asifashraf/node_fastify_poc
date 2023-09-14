exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.index(['paid']);
  });

exports.down = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.dropIndex(['paid']);
  });
