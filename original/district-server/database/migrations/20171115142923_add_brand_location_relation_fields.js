exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table
      .uuid('address_id')
      .references('id')
      .inTable('addresses')
      .index()
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('address_id');
  });
