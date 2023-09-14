exports.up = knex =>
  knex.schema.createTable('customers_addresses', table => {
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable()
      .onDelete('CASCADE');
    table
      .uuid('address_id')
      .references('id')
      .inTable('addresses')
      .index()
      .notNullable()
      .onDelete('CASCADE');
  });

exports.down = knex => knex.schema.dropTable('customers_addresses');
