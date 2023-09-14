exports.up = function (knex) {
  return knex.schema.alterTable('subscription_customers', table => {
    table.uuid('subscription_customer_auto_renewal_id')
      .references('id')
      .inTable('subscription_customer_auto_renewals')
      .index();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('subscription_customers', tableBuilder => {
    tableBuilder.dropColumn('subscription_customer_auto_renewal_id');
  });
};
