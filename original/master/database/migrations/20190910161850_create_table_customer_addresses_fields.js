exports.up = knex =>
  knex.schema.createTable('customer_addresses_fields', table => {
    table.uuid('id').primary();
    table.string('title').notNullable();
    table.string('title_ar').notNullable();
    table
      .boolean('is_required')
      .default(false)
      .notNullable();
    table
      .string('type')
      .default('text')
      .notNullable();
    table
      .integer('order')
      .default(0)
      .notNullable();
    table.uuid('country_id');
  });

exports.down = knex => knex.schema.dropTable('customer_addresses_fields');
