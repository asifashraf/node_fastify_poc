exports.up = function (knex) {
  return knex.schema.alterTable('subscriptions', tableBuilder => {
    tableBuilder.enu('subscription_type', ['CUP', 'BUNDLE'], {
      useNative: true,
      enumName: 'subscription_type_enum',
    })
      .notNullable()
      .defaultTo('CUP');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('subscriptions', tableBuilder => {
    tableBuilder.dropColumn('subscription_type');
  });
};
