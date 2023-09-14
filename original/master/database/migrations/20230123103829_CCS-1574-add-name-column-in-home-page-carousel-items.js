exports.up = function (knex) {
  return knex.schema.alterTable('home_page_carousel_items', (table) => {
    table.string('name');
  });
};
exports.down = function (knex) {
  return knex.schema.alterTable('home_page_carousel_items', (table) => {
    table.dropColumn('name');
  });
};
