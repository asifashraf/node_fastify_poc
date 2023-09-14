exports.up = function (knex) {
  return knex.schema.alterTable('filter_sets', (table) => {
    table.boolean('offer').default(false);
    table.boolean('free_delivery').default(false);
    table.jsonb('rating').nullable()
  });
};
exports.down = function (knex) {
  return knex.schema.alterTable('filter_sets', (table) => {
    table.dropColumn('offer');
    table.dropColumn('free_delivery');
    table.dropColumn('rating');
  });
};
  