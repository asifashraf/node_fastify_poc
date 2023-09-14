exports.up = knex =>
  knex.schema.table('customer_addresses', table => {
    table
      .string('country_code')
      .default('KW')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('customer_addresses', table => {
    table.dropColumn('country_code');
  });
