exports.up = function(knex, Promise) {
  return knex.schema.alterTable('order_sets', tableBuilder => {
    tableBuilder.index(['created_at']);
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.alterTable('order_sets', tableBuilder => {
    tableBuilder.dropIndex(['created_at']);
  });
};
