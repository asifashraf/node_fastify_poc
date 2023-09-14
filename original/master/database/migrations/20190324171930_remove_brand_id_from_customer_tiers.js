exports.up = knex =>
  knex.schema.table('customer_tiers', table => {
    table.dropColumn('brand_id');
  });

exports.down = knex =>
  knex.schema.table('customer_tiers', table => {
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index()
      .notNullable();
  });
