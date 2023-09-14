exports.up = function (knex) {
  return knex.schema.alterTable('menu_item_option_sets', (table) => {
    table.integer('min').default(null).nullable();
    table.integer('max').default(null).nullable();
    table.integer('free').default(null).nullable();
    table.boolean('unique').default(false);
  });
};
exports.down = function (knex) {
  return knex.schema.alterTable('menu_item_option_sets', (table) => {
    table.dropColumn('min');
    table.dropColumn('max');
    table.dropColumn('free');
    table.dropColumn('unique');
  });
};