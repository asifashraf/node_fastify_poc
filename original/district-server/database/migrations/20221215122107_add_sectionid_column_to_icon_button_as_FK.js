exports.up = function (knex) {
  return knex.schema.alterTable('home_page_icon_button_items', table => {
    table
      .uuid("section_id")
      .notNullable()
      .references("id")
      .inTable("home_page_sections")
      .onDelete("CASCADE");
  });

};
exports.down = function (knex) {
  return knex.schema.alterTable('home_page_icon_button_items', (table) => {
    table.dropForeign('section_id');
    table.dropColumn('section_id');
  });
};