exports.up = knex =>
  knex.schema.createTable('banners', table => {
    table.uuid('id').primary();
    table.string('image_url');
    table.string('image_url_ar');
    table.string('type');
    table
      .integer('order')
      .default(0)
      .notNullable();
    table.boolean('active').default(false);
    table.uuid('country_id');
  });

exports.down = knex => knex.schema.dropTable('banners');
