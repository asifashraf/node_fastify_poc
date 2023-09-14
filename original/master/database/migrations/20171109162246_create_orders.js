exports.up = knex =>
  knex.schema.createTable('orders', table => {
    table.uuid('id').primary();
    table.string('number').notNullable();
    table.string('transaction_id');
    table.string('note');
    table.specificType('subtotal', 'numeric(13, 3)');
    table.specificType('total', 'numeric(13, 3)');
    table
      .uuid('brand_location_id')
      .references('id')
      .inTable('brand_locations')
      .index()
      .notNullable();
  });

exports.down = knex => knex.schema.dropTable('orders');
