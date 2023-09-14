exports.up = knex =>
  knex.schema.createTable('checkout_customers', table => {
    table
      .text('customer_id')
      .references('id')
      .inTable('customers')
      .index();
    table.string('customer_token').index();
    table.unique(['customer_id', 'customer_token']);
  });

exports.down = knex => knex.schema.dropTable('checkout_customers');
