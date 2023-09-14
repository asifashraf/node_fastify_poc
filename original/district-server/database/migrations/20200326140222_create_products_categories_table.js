exports.up = knex =>
  knex.schema.createTable('products_categories', table => {
    table
      .uuid('product_id')
      .references('id')
      .inTable('products');
    table
      .uuid('category_id')
      .references('id')
      .inTable('categories');
  });

exports.down = knex => knex.schema.dropTable('products_categories');
