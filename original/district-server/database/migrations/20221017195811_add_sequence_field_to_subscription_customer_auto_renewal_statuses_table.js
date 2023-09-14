exports.up = function (knex) {
  return knex.schema.alterTable('subscription_customer_auto_renewal_statuses', table => {
    table.bigIncrements('sequence', { primaryKey: false }).notNullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('subscription_customer_auto_renewal_statuses', tableBuilder => {
    tableBuilder.dropColumn('sequence');
  });
};
