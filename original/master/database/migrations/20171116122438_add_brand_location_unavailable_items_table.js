exports.up = knex =>
  knex.schema.createTable('brand_locations_unavailable_menu_items', table => {
    table
      .uuid('brand_location_id')
      .references('id')
      .inTable('brand_locations')
      .index()
      .notNullable()
      .onDelete('CASCADE');
    table
      .uuid('menu_item_id')
      .references('id')
      .inTable('menu_items')
      .index()
      .notNullable()
      .onDelete('CASCADE');
    table
      .datetime('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });

exports.down = knex =>
  knex.schema.dropTable('brand_locations_unavailable_menu_items');
