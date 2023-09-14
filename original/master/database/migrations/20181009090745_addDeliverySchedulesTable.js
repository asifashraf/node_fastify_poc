exports.up = knex =>
  knex.schema
    .createTable('delivery_schedules', table => {
      table.uuid('id').primary();
      table.integer('day').notNullable();
      table.time('open_time');
      table.integer('open_duration');
      table
        .boolean('open_all_day')
        .default(false)
        .notNullable();
      table
        .uuid('brand_location_id')
        .references('id')
        .inTable('brand_locations')
        .index()
        .notNullable()
        .onDelete('CASCADE');
    })
    .raw(
      `ALTER TABLE delivery_schedules ADD CONSTRAINT day_validity_check CHECK ( day >= 1 AND day <= 7);`
    );

exports.down = knex => knex.schema.dropTable('delivery_schedules');
