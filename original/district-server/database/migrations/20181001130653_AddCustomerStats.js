exports.up = knex =>
  knex.schema.createTable('customer_stats', table => {
    table.uuid('id').primary();
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .unique()
      .notNullable()
      .onDelete('CASCADE');
    table
      .integer('total_orders')
      .notNullable()
      .default(0);
    table.specificType('total_kd_spent', 'numeric(13, 3)').default(0);
    table
      .datetime('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .datetime('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });

exports.down = knex => knex.schema.dropTable('customer_stats');
