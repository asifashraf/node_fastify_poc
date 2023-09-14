exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.index(['short_code']);
  });

exports.down = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.dropIndex(['short_code']);
  });
