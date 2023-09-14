exports.up = function (knex) {
  return knex.schema.alterTable('customer_account_deletion_request', table => {
    table
      .string('description', 280)
      .alter();
  });
};

exports.down = async function (knex) {
  return knex.schema.alterTable('customer_account_deletion_request', table => {
    table
      .string('description')
      .alter();
  });
};
