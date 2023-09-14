exports.up = knex =>
  knex.schema.createTable('discovery_credit_redemptions', table => {
    table.uuid('id').primary();
    table
      .uuid('discovery_credit_id')
      .references('id')
      .inTable('discovery_credits')
      .index()
      .notNullable();
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index()
      .notNullable();
    table
      .uuid('brand_location_id')
      .references('id')
      .inTable('brand_locations')
      .index()
      .notNullable();

    table.specificType('amount', 'numeric(13,3)').default(0);

    table
      .string('reference_order_id')
      .notNullable()
      .index();

    table
      .boolean('refunded')
      .index()
      .default(false);
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });

exports.down = knex => knex.schema.dropTable('discovery_credit_redemptions');
