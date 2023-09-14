exports.up = function (knex) {
  return knex.schema.alterTable('menu_item_option_sets', (table) => {
    table.integer('min').default(null).nullable();
    table.integer('max').default(null).nullable();
  });
};
exports.down = function (knex) {
  return knex.schema.alterTable('menu_item_option_sets', (table) => {
    table.dropColumn('min');
    table.dropColumn('max');
  });
};