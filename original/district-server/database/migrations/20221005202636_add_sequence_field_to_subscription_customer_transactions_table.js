exports.up = function (knex) {
  return knex.schema.alterTable('subscription_customer_transactions', table => {
    table.bigIncrements('sequence', { primaryKey: false }).notNullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('subscription_customer_transactions', tableBuilder => {
    tableBuilder.dropColumn('sequence');
  });
};
