const { orderSetStatusName } = require('../../src/schema/root/enums');

exports.up = function(knex) {
  return knex.schema.alterTable('order_sets', tableBuilder => {
    tableBuilder.enu('current_status', Object.values(orderSetStatusName), {
      useNative: true,
      enumName: 'order_set_statuses_enum',
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('order_sets', tableBuilder => {
    tableBuilder.dropColumn('current_status');
  });
};
