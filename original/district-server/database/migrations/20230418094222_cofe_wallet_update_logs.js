
exports.up = function (knex) {
  return knex.schema.createTable('wallet_update_logs', (table) => {
    table.string('admin_id', 164).nullable().index();
    table.string('customer_id', 164).notNullable().index();
    table.uuid('currency_id').notNullable().index();
    table.uuid('brand_id').nullable().index();
    table.string('tx_type', 164).notNullable().index();
    table.string('tx_action', 164).notNullable().index();
    table.string('tx_reason', 164).nullable().index();
    table.text('comments').nullable();
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('wallet_update_logs');
};
