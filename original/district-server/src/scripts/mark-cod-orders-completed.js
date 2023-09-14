/* eslint-disable camelcase */
const knex = require('../../database');

const { DateTime } = require('luxon');
const { dateTimeConfig, uuid } = require('../lib/util');

const {
  orderSetStatusNames,
  paymentStatusName,
  paymentStatusOrderType,
} = require('../schema/root/enums');
console.log('Running: mark-paid-orders-completed');

knex
  .select(
    `order_set_statuses.id as orderSetStatusId`,
    `order_set_statuses.status as orderSetStatus`,
    `payment_statuses.name as paymentStatus`,
    `order_set_statuses.order_set_id as orderSetId`
  )
  .from('order_sets')
  .innerJoin(
    'order_fulfillment',
    'order_fulfillment.order_set_id',
    'order_sets.id'
  )
  .innerJoin(
    'payment_statuses',
    'payment_statuses.id',
    knex.raw(
      `(select payment_statuses.id from payment_statuses where payment_statuses.reference_order_id = order_sets.id order by payment_statuses.created_at desc limit 1)`
    )
  )
  .innerJoin(
    'order_set_statuses',
    'order_set_statuses.id',
    knex.raw(
      `(select order_set_statuses.id from order_set_statuses where order_set_statuses.order_set_id = order_sets.id order by created_at desc limit 1)`
    )
  )
  .where('payment_statuses.name', paymentStatusName.PAYMENT_PENDING)
  .where('order_set_statuses.status', orderSetStatusNames.ACCEPTED)
  .whereRaw(
    `to_char(order_set_statuses.created_at, 'YYYY-MM-DD') != '${DateTime.fromObject(
      dateTimeConfig.obj
    )
      .startOf('day')
      .toFormat('yyyy-MM-dd')}'`
  )
  .then(statuses => {
    console.log('to be done', statuses.length);
    const updatedOrderSetStatuses = [];
    const updatedOrderSetPaymentStatuses = [];

    if (statuses.length > 0) {
      const status = orderSetStatusNames.COMPLETED;
      const paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
      statuses.forEach(node => {
        // if order's not from today and is from yesterday or even before
        updatedOrderSetStatuses.push({
          id: uuid.get(),
          order_set_id: node.orderSetId,
          status,
        });
        updatedOrderSetPaymentStatuses.push({
          id: uuid.get(),
          reference_order_id: node.orderSetId,
          order_type: paymentStatusOrderType.ORDER_SET,
          name: paymentStatus,
          raw_response: '{"isCash": true}',
        });
      });
      knex
        .transaction(async trx => {
          return Promise.all([
            trx('order_set_statuses').insert(updatedOrderSetStatuses),
            trx('payment_statuses').insert(updatedOrderSetPaymentStatuses),
          ]);
        })
        .then(() => {
          console.log('Transaction complete.');
        })
        .catch(err => {
          console.error(err);
        });
    }
  })
  .then(() => {
    console.log('all done!');
    return knex.destroy();
  });