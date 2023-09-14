exports.up = knex =>
  knex.schema.alterTable('otp_available_countries', table => {
    table
      .string('otp_provider_secondary', 32)
      .nullable();
  });

exports.down = knex =>
  knex.schema.table('otp_available_countries', table => {
    table.dropColumn('otp_provider_secondary');
  });
