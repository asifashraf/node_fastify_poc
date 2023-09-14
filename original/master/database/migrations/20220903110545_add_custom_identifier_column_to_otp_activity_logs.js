exports.up = knex =>
  knex.schema.table('otp_activity_logs', table => {
    table.string('custom_identifier').nullable().index();
  });

exports.down = knex =>
  knex.schema.table('otp_activity_logs', table => {
    table.dropColumn('custom_identifier');
  });
