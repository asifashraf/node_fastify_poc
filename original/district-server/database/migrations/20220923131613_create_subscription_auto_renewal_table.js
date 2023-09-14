exports.up = function (knex) {
  return knex.schema.createTable('subscription_customer_auto_renewals', table => {
    table.uuid('id').primary().notNullable();
    table.string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable();
    table.uuid('subscription_id')
      .references('id')
      .inTable('subscriptions')
      .index()
      .notNullable();
    table.string('status', 128);
    table.string('payment_provider', 32);
    table.jsonb('payment_information');
    table.timestamps(false, true);
  });
};

exports.down = async function (knex) {
  return knex.schema.dropTable('subscription_customer_auto_renewals');
};
