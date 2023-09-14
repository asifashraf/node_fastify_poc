exports.up = knex =>
  knex.schema.table('payment_statuses', table => {
    table.string('payment_type', 100).defaultTo(null);
    table.string('mastercard_session_id');
    table.string('mastercard_session_version');
    table.string('mastercard_success_indicator');
  });

exports.down = knex =>
  knex.schema.table('payment_statuses', table => {
    table.dropColumn('payment_type');
    table.dropColumn('mastercard_session_id');
    table.dropColumn('mastercard_session_version');
    table.dropColumn('mastercard_success_indicator');
  });
