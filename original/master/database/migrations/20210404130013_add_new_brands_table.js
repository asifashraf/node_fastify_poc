exports.up = knex =>
  knex.schema.createTable('new_brands', table => {
    table.uuid('id').primary();
    table
      .uuid('country_id')
      .index()
      .notNullable();
    table.uuid('brand_id').notNullable();
    table.integer('order');

    table
      .foreign('country_id')
      .references('countries.id')
      .onDelete('CASCADE');
    table
      .foreign('brand_id')
      .references('brands.id')
      .onDelete('CASCADE');
  });

exports.down = knex => knex.schema.dropTable('new_brands');
