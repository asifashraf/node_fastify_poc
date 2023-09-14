exports.up = knex =>
  knex.schema
    .table('customers_addresses', table => {
      table.dropColumn('address_id');
      table.dropColumn('customer_id');
    })
    .table('customers_addresses', table => {
      table.uuid('id').primary();
      table
        .string('customer_id')
        .references('id')
        .inTable('customers')
        .index()
        .notNullable()
        .onDelete('CASCADE');

      table.string('friendly_name').notNullable();
      table.string('note');
      table
        .boolean('is_default')
        .default(false)
        .notNullable();
      table.specificType('geolocation', 'geometry(Point,4326)');
      table.string('block').notNullable();
      table.string('street').notNullable();
      table.string('avenue');
      table
        .uuid('neighborhood_id')
        .references('id')
        .inTable('neighborhoods')
        .index()
        .notNullable();
      table.string('street_number').notNullable();
      table.string('type').notNullable();
      table.string('floor');
      table.string('unit_number');
    })
    .renameTable('customers_addresses', 'customer_addresses')
    .table('customers', table => {
      table.dropColumn('default_address_id');
    });

exports.down = knex =>
  knex.schema
    .table('customers_addresses', table => {
      table
        .uuid('address_id')
        .references('id')
        .inTable('addresses')
        .index()
        .notNullable()
        .onDelete('CASCADE');
      table
        .string('customer_id')
        .references('id')
        .inTable('customers')
        .index()
        .notNullable()
        .onDelete('CASCADE');
      table.dropColumn('id');
      table.dropColumn('friendly_name');
      table.dropColumn('note');
      table.dropColumn('is_default');
      table.dropColumn('geolocation');
      table.dropColumn('block');
      table.dropColumn('street');
      table.dropColumn('avenue');
      table.dropColumn('neighborhood_id');
      table.dropColumn('street_number');
      table.dropColumn('type');
      table.dropColumn('floor');
      table.dropColumn('unit_number');
    })
    .renameTable('customer_addresses', 'customers_addresses')
    .table('customers', table => {
      table
        .uuid('default_address_id')
        .references('id')
        .inTable('addresses')
        .index()
        .notNullable();
    });
