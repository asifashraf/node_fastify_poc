const { orderSetRefundReason } = require('../../src/schema/order-set/enums');

exports.up = function (knex) {
  return knex.schema.alterTable('order_sets', tableBuilder => {
    tableBuilder.enu('refund_reason', Object.values(orderSetRefundReason), {
      useNative: true,
      enumName: 'order_refund_reason_enum',
    })
      .nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('order_sets', tableBuilder => {
    tableBuilder.dropColumn('refund_reason');
  });
};