exports.up = knex =>
  knex.schema.createTable('nutritional_info_allergens', table => {
    table
      .uuid('nutritional_info_id')
      .references('id')
      .inTable('nutritional_info')
      .index()
      .notNullable();
    table
      .uuid('allergen_id')
      .references('id')
      .inTable('allergens')
      .index()
      .notNullable();
  });

exports.down = knex => knex.schema.dropTable('nutritional_info_allergens');
