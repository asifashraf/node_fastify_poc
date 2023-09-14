exports.up = knex =>
  knex.schema.createTable('brand_location_devices', table => {
    table.uuid('id').primary();
    table.string('device_id', 16).notNullable();
    table.string('code', 16).notNullable();
    table
      .uuid('brand_location_id')
      .references('id')
      .inTable('brand_locations')
      .index();
    table.string('status', 16).notNullable();
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });

exports.down = knex => knex.schema.dropTable('brand_location_devices');
