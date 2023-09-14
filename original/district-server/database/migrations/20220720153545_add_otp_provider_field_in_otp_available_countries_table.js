exports.up = knex =>
  knex.schema.table('otp_available_countries', table => {
    table
      .string('otp_provider', 32)
      .notNullable()
      .defaultTo('KARIX');
  });

exports.down = knex =>
  knex.schema.table('otp_available_countries', table => {
    table.dropColumn('otp_provider');
  });
