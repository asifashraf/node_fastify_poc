exports.up = knex =>
  knex.schema.table('product_images', table => {
    table.dropColumn('main_image');
  });

exports.down = knex =>
  knex.schema.alterTable('product_images', table => {
    table.boolean('main_image').default(false);
  });
