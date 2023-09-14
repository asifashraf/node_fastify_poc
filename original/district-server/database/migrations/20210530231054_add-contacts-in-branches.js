exports.up = knex =>
  knex.schema.alterTable('brand_locations', table => {
    table
      .json('contact')
      .nullable()
      .default(JSON.stringify([]));
  });

exports.down = knex =>
  knex.schema.alterTable('brand_locations', table => {
    table.dropColumn('contact');
  });
