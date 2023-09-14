exports.up = knex =>
  knex.schema.table('order_sets', table => {
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('order_sets', table => {
    table.dropColumn('customer_id');
  });
