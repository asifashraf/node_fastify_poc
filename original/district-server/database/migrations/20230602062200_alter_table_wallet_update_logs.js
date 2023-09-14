exports.up = function (knex) {
  return knex.schema.alterTable('wallet_update_logs', (table) => {
    table.double('tx_amount', 4).defaultTo(0);
  });
};
exports.down = function (knex) {
  return knex.schema.alterTable('wallet_update_logs', (table) => {
    table.dropColumn('tx_amount');
  });
};
