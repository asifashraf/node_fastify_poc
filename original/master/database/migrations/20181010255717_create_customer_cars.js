exports.up = knex =>
  knex.schema.createTable('customer_cars', table => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.string('color');
    table.string('brand');
    table.string('plate_number');
    table.string('note');
    table
      .boolean('is_default')
      .default(false)
      .notNullable();
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable()
      .onDelete('CASCADE');
  });

exports.down = knex => knex.schema.dropTable('customer_cars');
