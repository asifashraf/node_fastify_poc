exports.up = function (knex) {
  return knex.schema.createTable('subscription_customer_auto_renewal_statuses', table => {
    table.uuid('id').primary().notNullable();
    table.uuid('subscriptions_auto_renewal_id')
      .references('id')
      .inTable('subscription_customer_auto_renewals')
      .index()
      .notNullable();
    table.string('action_src');
    table.string('action_type');
    table.string('action_result');
    table.jsonb('action_result_detail');
    table.timestamps(false, true);
  });
};

exports.down = async function (knex) {
  return knex.schema.dropTable('subscription_customer_auto_renewal_statuses');
};
