exports.up = knex =>
  knex.schema.table('inventories', table => {
    table.dropUnique(['pickup_location_id', 'reference_type', 'reference_id']);
    table.dropColumn('reference_type');
    table.dropColumn('reference_id');
    table
      .uuid('product_id')
      .references('id')
      .inTable('products');
    table.unique(['pickup_location_id', 'product_id']);
  });

exports.down = knex =>
  knex.schema.alterTable('inventories', table => {
    table
      .string('reference_type', 100)
      .index()
      .notNullable();
    table
      .string('reference_id')
      .index()
      .notNullable();
    table.unique(['pickup_location_id', 'reference_type', 'reference_id']);
    table.dropUnique(['pickup_location_id', 'product_id']);
    table.dropColumn('product_id');
  });
