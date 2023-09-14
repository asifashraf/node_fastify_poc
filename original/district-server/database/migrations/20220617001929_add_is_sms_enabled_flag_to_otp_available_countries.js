exports.up = knex =>
  knex.schema.table('otp_available_countries', table => {
    table
      .boolean('is_sms_enabled')
      .notNullable()
      .defaultTo(true);
  });

exports.down = knex =>
  knex.schema.table('otp_available_countries', table => {
    table.dropColumn('is_sms_enabled');
  });
