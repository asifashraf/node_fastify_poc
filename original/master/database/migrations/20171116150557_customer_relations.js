exports.up = knex =>
  knex.schema.table('customers', table => {
    table
      .uuid('default_address_id')
      .references('id')
      .inTable('addresses')
      .index()
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('default_address_id');
  });
