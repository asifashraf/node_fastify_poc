exports.up = function (knex) {
  return knex.schema.createTable('customer_account_deletion_reason', table => {
    table.uuid('id')
      .primary()
      .notNullable();
    table.json('reason')
      .notNullable();
    table.integer('order')
      .default(0)
      .notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable('customer_account_deletion_reason');
};
