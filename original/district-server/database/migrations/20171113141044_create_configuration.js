exports.up = knex =>
  knex.schema.createTable('configuration', table => {
    table.specificType('service_fee', 'numeric(13, 3)');
    table.specificType('delivery_fee', 'numeric(13, 3)');
    table.specificType('default_longitude', 'decimal(9, 6)');
    table.specificType('default_latitude', 'decimal(9, 6)');
    table.time('platform_hours_start').notNullable();
    table.integer('platform_hours_duration').notNullable();
    table
      .integer('max_cart_size')
      .default(20)
      .notNullable();
  });

exports.down = knex => knex.schema.dropTable('configuration');
