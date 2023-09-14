exports.up = function(knex) {
  return knex.schema.table('customers', table => {
    table.boolean('is_privacy_policy_accepted').defaultTo(false);
    table.dateTime('privacy_policy_accept_date').nullable();
    table.boolean('is_terms_and_conditions_accepted').defaultTo(true);
    table.dateTime('terms_and_conditions_accept_date').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('customers', table => {
    table.dropColumn('is_privacy_policy_accepted');
    table.dropColumn('privacy_policy_accept_date');
    table.dropColumn('is_terms_and_conditions_accepted');
    table.dropColumn('terms_and_conditions_accept_date');
  });
};
