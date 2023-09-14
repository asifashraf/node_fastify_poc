exports.up = knex =>
  knex.schema
    .table('order_fulfillment', table => {
      table.dropColumn('address_id');
    })
    .createTable('delivery_addresses', table => {
      table.uuid('id').primary();
      table.string('address_1').notNullable();
      table.string('address_2');
      table.string('city').notNullable();
      table.string('province').notNullable();
      table.string('country').notNullable();
      table.string('zip').notNullable();
      table
        .uuid('order_fulfillment_id')
        .references('id')
        .inTable('order_fulfillment')
        .index()
        .notNullable();
      table.specificType('geolocation', 'geometry(Point,4326)');
    });

exports.down = knex =>
  knex.schema
    .dropTable('delivery_addresses')
    .table('order_fulfillment', table => {
      table
        .uuid('address_id')
        .references('id')
        .inTable('addresses')
        .notNullable();
    });
