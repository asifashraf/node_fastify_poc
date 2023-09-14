exports.up = async knex => {
  await knex.schema.table('products_categories', table => {
    table.index('product_id', 'idx-products_categories-product_id');
    table.index('category_id', 'idx-products_categories-category_id');
  });
};

exports.down = async knex => {
  await knex.schema.table('products_categories', table => {
    table.dropIndex('product_id', 'idx-products_categories-product_id');
    table.dropIndex('category_id', 'idx-products_categories-category_id');
  });
};
