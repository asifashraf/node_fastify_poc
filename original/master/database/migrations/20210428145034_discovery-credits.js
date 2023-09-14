exports.up = knex =>
  knex.schema.createTable('discovery_credits', table => {
    table.uuid('id').primary();
    table
      .string('customer_id')
      .index()
      .notNullable();
    table
      .uuid('country_id')
      .index()
      .notNullable();
    table
      .foreign('country_id')
      .references('countries.id')
      .onDelete('CASCADE');

    table
      .uuid('currency_id')
      .references('id')
      .inTable('currencies')
      .index()
      .notNullable();

    table.specificType('amount', 'numeric(13,3)').default(0);
    table.specificType('amount_per_order', 'numeric(13,3)').default(0);
    table.integer('no_of_orders_per_brand');
    table.specificType('min_order_amount', 'numeric(13,3)').default(0);
    table.integer('expires_on').default(0);
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });

exports.down = knex => knex.schema.dropTable('discovery_credits');
