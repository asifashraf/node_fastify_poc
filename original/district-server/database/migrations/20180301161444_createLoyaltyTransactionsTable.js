exports.up = knex =>
  knex.schema.createTable('loyalty_transactions', table => {
    table.uuid('id').primary();
    table.string('order_type').notNullable();
    table
      .string('reference_order_id')
      .notNullable()
      .unique();
    table
      .specificType('credit', 'numeric(13, 3)')
      .notNullable()
      .default(0);
    table
      .specificType('debit', 'numeric(13, 3)')
      .notNullable()
      .default(0);
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
  });

exports.down = knex => knex.schema.dropTable('loyalty_transactions');
