exports.up = knex =>
  knex.schema.alterTable('orders', table => {
    table.dropColumn('customer_id');
  });

exports.down = knex =>
  knex.schema.alterTable('orders', table => {
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index();
  });
