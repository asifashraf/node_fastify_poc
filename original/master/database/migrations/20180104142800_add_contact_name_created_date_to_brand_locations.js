exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table.string('contact_name');
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('contact_name');
    table.dropColumn('created_at');
  });
