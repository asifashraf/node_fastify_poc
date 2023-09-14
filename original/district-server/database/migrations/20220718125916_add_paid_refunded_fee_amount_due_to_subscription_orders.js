exports.up = function (knex) {
  return knex.schema.alterTable('subscription_orders', tableBuilder => {
    tableBuilder.boolean('paid').notNullable().defaultTo(false);
    tableBuilder.boolean('refunded').nullable();
    tableBuilder.specificType('amount_due', 'numeric(13, 3)').defaultTo(0.0);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('subscription_orders', tableBuilder => {
    tableBuilder.dropColumn('paid');
    tableBuilder.dropColumn('refunded');
    tableBuilder.dropColumn('amount_due');
  });
};
