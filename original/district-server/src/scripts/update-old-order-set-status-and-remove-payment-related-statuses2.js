/* eslint-disable camelcase */
const knex = require('../../database');

const { DateTime } = require('luxon');
const { dateTimeConfig } = require('../lib/util');

const { orderSetStatusNames } = require('../schema/root/enums');
console.log(
  'Running: update-old-order-set-status-and-remove-payment-related-statuses2'
);

knex
  .select(
    `order_set_statuses.id as orderSetStatusId`,
    `order_set_statuses.status as orderSetStatus`,
    `order_statuses.name as orderStatus`,
    `payment_statuses.name as paymentStatus`,
    `order_set_statuses.order_set_id as orderSetId`,
    `order_statuses.time as time`
  )
  .from('order_set_statuses')
  .innerJoin(
    'orders',
    'order_set_statuses.order_set_id',
    ' orders.order_set_id'
  )
  .innerJoin(
    'order_statuses',
    'order_statuses.id',
    knex.raw(
      `(select order_statuses.id from order_statuses where order_id = orders.id order by order_statuses.time desc limit 1)`
    )
  )
  .innerJoin(
    'payment_statuses',
    'payment_statuses.id',
    knex.raw(
      `(select payment_statuses.id from payment_statuses where payment_statuses.reference_order_id = order_set_statuses.order_set_id order by payment_statuses.created_at desc limit 1)`
    )
  )
  .whereIn('order_set_statuses.status', ['PAYMENT_COMPLETE', 'PAYMENT_PENDING'])
  .orderBy('order_statuses.time', 'DESC')
  .then(statuses => {
    const updatedOrderSetStatuses = [];

    const startOfDay = DateTime.fromObject(dateTimeConfig.obj)
      .startOf('day')
      .toISO();
    statuses.forEach(node => {
      // if order's not from today and is from yesterday or even before
      let status = '';

      if (node.orderStatus === 'PROCESSING') {
        status = orderSetStatusNames.PREPARING;
      }
      if (node.orderStatus === 'READY') {
        status = orderSetStatusNames.PREPARED;
      }
      if (
        node.orderStatus === 'FULFILLED' &&
        node.paymentStatus === 'PAYMENT_SUCCESS'
      ) {
        status = orderSetStatusNames.COMPLETED;
      } else {
        status = orderSetStatusNames.DELIVERED;
      }
      if (node.orderStatus === 'WITH_COURIER') {
        status = orderSetStatusNames.OUT_FOR_DELIVERY;
      }

      // If payment is pending and order is processing
      if (
        node.orderSetStatus === 'PAYMENT_PENDING' &&
        node.orderStatus === 'PROCESSING' &&
        node.paymentStatus === 'PAYMENT_PENDING'
      ) {
        // if order's not from today and is from yesterday or even before
        if (node.time < startOfDay) {
          status = orderSetStatusNames.PREPARING;
        } else {
          status = orderSetStatusNames.REJECTED;
        }
      }
      // If payment is complete, and order is processing
      if (
        node.orderSetStatus === 'PAYMENT_COMPLETE' &&
        node.orderStatus === 'PROCESSING' &&
        node.paymentStatus === 'PAYMENT_SUCCESS'
      ) {
        status = orderSetStatusNames.PREPARING;
      }
      // If payment is complete and order is fulfilled. => COMPLETED
      if (
        node.orderSetStatus === 'PAYMENT_COMPLETE' &&
        node.orderStatus === 'FULFILLED' &&
        (node.paymentStatus === 'PAYMENT_SUCCESS' ||
          node.paymentStatus === 'PAYMENT_FAILURE')
      ) {
        status = orderSetStatusNames.COMPLETED;
      }
      // If payment is complete, pending, and order is processing
      if (
        (node.orderSetStatus === 'PAYMENT_COMPLETE' ||
          node.orderSetStatus === 'PAYMENT_PENDING') &&
        node.orderStatus === 'PROCESSING' &&
        node.paymentStatus === 'PAYMENT_FAILURE'
      ) {
        // if order's not from today and is from yesterday or even before
        if (node.time < startOfDay) {
          status = orderSetStatusNames.REJECTED;
        } else {
          status = orderSetStatusNames.PREPARING;
        }
      }
      // If payment is pending, and order is processing
      if (
        node.orderSetStatus === 'PAYMENT_PENDING' &&
        node.orderStatus === 'PROCESSING' &&
        node.paymentStatus === 'PAYMENT_SUCCESS'
      ) {
        // if order's not from today and is from yesterday or even before
        if (node.time < startOfDay) {
          status = orderSetStatusNames.COMPLETED;
        } else {
          status = orderSetStatusNames.PREPARING;
        }
      }
      // If payment is pending, and order is processing
      if (
        node.orderSetStatus === 'PAYMENT_PENDING' &&
        node.orderStatus === 'FULFILLED' &&
        node.paymentStatus === 'PAYMENT_SUCCESS'
      ) {
        status = orderSetStatusNames.COMPLETED;
      }
      // If payment is pending, and order is fulfilled
      if (
        node.orderSetStatus === 'PAYMENT_PENDING' &&
        node.orderStatus === 'FULFILLED' &&
        node.paymentStatus === 'PAYMENT_PENDING'
      ) {
        // if order's not from today and is from yesterday or even before
        if (node.time < startOfDay) {
          status = orderSetStatusNames.COMPLETED;
        } else {
          status = orderSetStatusNames.DELIVERED;
        }
      }
      // If payment is complete, and order is processing
      if (
        node.orderSetStatus === 'PAYMENT_COMPLETE' &&
        node.orderStatus === 'FULFILLED' &&
        node.paymentStatus === 'PAYMENT_PENDING'
      ) {
        status = orderSetStatusNames.COMPLETED;
      }
      // If payment is complete, and order is with courier
      if (
        node.orderSetStatus === 'PAYMENT_COMPLETE' &&
        node.orderStatus === 'WITH_COURIER' &&
        node.paymentStatus === 'PAYMENT_SUCCESS'
      ) {
        status = orderSetStatusNames.OUT_FOR_DELIVERY;
      }
      updatedOrderSetStatuses.push({ id: node.orderSetStatusId, status });
    });

    return knex
      .transaction(trx => {
        return knex
          .select(1)
          .then(() => {
            return Promise.all(
              updatedOrderSetStatuses.map(updatedOrderSetStatus => {
                return knex('order_set_statuses')
                  .update({
                    status: updatedOrderSetStatus.status,
                  })
                  .where('id', '=', updatedOrderSetStatus.id)
                  .transacting(trx);
              })
            );
          })
          .then(trx.commit)
          .catch(trx.rollback);
      })
      .then(() => {
        console.log('Transaction complete.');
      })
      .catch(err => {
        console.error(err);
      });
  })
  .then(() => {
    console.log('all done!');
    return knex.destroy();
  });
