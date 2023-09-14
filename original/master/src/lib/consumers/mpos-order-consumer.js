const sqs = require('./../../lib/sqs-base')('mpos');
const Axios = require('axios');
const {
  slackHostURL,
  mpos
} = require('../../../config');

const axios = Axios.create({
  baseURL: slackHostURL,
  timeout: 6000,
});

module.exports = function MposOrderConsumer(queryContext) {
  const sqsConsumer = async ({ payload }) => {
    queryContext.callbackWaitsForEmptyEventLoop = false;
    const orderList = [];
    const paymentQueryList = [];
    let isCashOrder = false;
    try {
      for (const record of payload.Records) {
        const messageBody = JSON.parse(record.body);
        const insertedStatus = messageBody.status;
        const orderId = messageBody.orderId;
        isCashOrder = messageBody.isCashOrder;
        console.log('Status:', insertedStatus);
        console.log('orderSetId:', orderId);
        let ignoreUpdate = false;
        let orderCurrentStatus = null;
        if (insertedStatus === 'COMPLETED') {
          orderCurrentStatus = await queryContext.db
            .getInstance()
            .table('order_sets')
            .select('current_status')
            .where('id', orderId)
            .first();
          console.log('Current Status:', orderCurrentStatus);
          ignoreUpdate =
            orderCurrentStatus.current_status === 'REPORTED' ||
            orderCurrentStatus.current_status === 'REJECTED';
        }
        if (ignoreUpdate) {
          const text = `[ERROR] [${process.env.NODE_ENV}] [LAMBDA] Auto completed order ignored for order (${orderId}). Order Current Status(${orderCurrentStatus.current_status})`;
          const messageBody = {
            username: 'Error notifier',
            text: '```' + text + '```',
          };
          await axios.post(mpos.slackWebHook, messageBody);
        } else {
          orderList.push({
            id: uuid.get(),
            orderSetId: orderId,
            status: insertedStatus,
            clientName: 'BARISTA_MPOS',
          });
          if (isCashOrder) {
            console.log('Cash Order');
            paymentQueryList.push({
              id: uuid.get(),
              referenceOrderId: orderId,
              rawResponse: '{"isCash": true, "paid": true}',
              name: 'PAYMENT_SUCCESS',
              orderType: 'ORDER_SET',
            });
            await queryContext.db
              .getInstance()
              .table('order_sets')
              .update({ paid: true })
              .where('id', orderId);
          }
        }
      }
      if (orderList.length > 0) {
        await queryContext.db
          .getInstance()
          .table('order_set_statuses')
          .insert(orderList);
      }
      if (paymentQueryList.length > 0) {
        await queryContext.db
          .getInstance()
          .table('payment_statuses')
          .insert(paymentQueryList);
      }
    } catch (ex) {
      const { stack, message } = ex || {};
      queryContext.kinesisLogger.sendLogEvent(
        { stack, message },
        'mpos-order-consumer-exception'
      );
    }
  };
  sqs.consume({ callback: sqsConsumer });
};
