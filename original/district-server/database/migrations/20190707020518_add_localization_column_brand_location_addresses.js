exports.up = knex =>
  knex.schema.table('brand_location_addresses', table => {
    table
      .string('short_address_ar')
      .default('')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('brand_location_addresses', table => {
    table.dropColumn('short_address_ar');
  });
