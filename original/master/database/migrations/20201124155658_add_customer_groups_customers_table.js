exports.up = knex =>
  knex.schema.createTable('customer_groups_customers', table => {
    table
      .uuid('customer_group_id')
      .references('id')
      .inTable('customer_groups')
      .index()
      .notNullable()
      .onDelete('CASCADE');
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable()
      .onDelete('CASCADE');
  });

exports.down = knex => knex.schema.dropTable('customer_groups_customers');
