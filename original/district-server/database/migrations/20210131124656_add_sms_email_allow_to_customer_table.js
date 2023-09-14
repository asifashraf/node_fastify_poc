exports.up = function(knex) {
  return knex.schema.table('customers', table => {
    table.boolean('allow_sms').nullable();
    table.boolean('allow_email').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('customers', table => {
    table.dropColumn('allow_sms');
    table.dropColumn('allow_email');
  });
};
