exports.up = function (knex) {
  return knex.schema.alterTable('home_page_carousel_item_settings', (table) => {
    table.integer('duration_time_in_ms').notNullable().defaultTo(3000);
  });
};
exports.down = function (knex) {
  return knex.schema.alterTable('home_page_carousel_item_settings', (table) => {
    table.dropColumn('duration_time_in_ms');
  });
};
