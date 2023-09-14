exports.up = function (knex) {
  return knex.schema.alterTable('customer_account_deletion_reason', tableBuilder => {
    tableBuilder.boolean('is_deleted').defaultTo(false);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('customer_account_deletion_reason', tableBuilder => {
    tableBuilder.dropColumn('is_deleted');
  });
};
