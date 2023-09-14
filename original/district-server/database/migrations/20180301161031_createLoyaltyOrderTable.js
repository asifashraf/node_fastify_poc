exports.up = knex =>
  knex.schema.createTable('loyalty_orders', table => {
    table.uuid('id').primary();
    table.string('sku').notNullable();
    table.specificType('amount', 'numeric(13, 3)');
    table.specificType('bonus', 'numeric(13, 3)');
    table
      .datetime('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable()
      .onDelete('CASCADE');
    table.string('merchant_id');
    table.string('receipt_url', 1024);
    table.string('error_url', 1024);
  });

exports.down = knex => knex.schema.dropTable('loyalty_orders');
