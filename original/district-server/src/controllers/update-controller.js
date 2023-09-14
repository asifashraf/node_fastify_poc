const { isNil } = require('lodash');
const { publishSubscriptionEvent, uuid } = require('../lib/util');
const { setupAuthContext } = require('../helpers/context-helpers');
const {
  orderSetSubscriptionEvent,
  orderSetStatusNames,
} = require('../schema/root/enums');
const {
  flickConfig: { enableLogging: logFlick, courierName },
} = require('../../config');

exports.updateRevelOrder = async (req, res) => {
  const context = await setupAuthContext(req);
  const posOrderId = req.body.orderInfo.local_id;
  const order = await context.db
    .table('order_sets')
    .select()
    .where('pos_order_id', posOrderId)
    .first();

  await context.orderSetStatus.setStatusForOrderSetId(
    order.id,
    'COMPLETED',
    context
  );
  await publishSubscriptionEvent(
    context,
    order.id,
    orderSetSubscriptionEvent.ORDER_SET_UPDATED
  );
  return res.send('ok');
};

exports.flickOrderUpdate = async (req, res) => {
  const { body } = req;
  const { queryContextWithoutAuth } = req.app;
  if (logFlick) console.log('Flick callback request to us\n', body);

  const {
    order: flickOrderId,
    partnerReferenceID: orderSetId,
    deliveryDate,
    deliveryStatus,
  } = body;
  const lastUpdated = new Date().toISOString();
  const deliveredAt = deliveryDate === '' ? null : deliveryDate;

  if (isNil(flickOrderId)) {
    res.statusCode = 400;
    return res.send({ result: false, code: 400, message: 'Order is Nil' });
  }
  if (!uuid.validate(orderSetId)) {
    res.statusCode = 400;
    return res.send({
      result: false,
      code: 400,
      message: 'partnerReferenceID is not a valid UUID.',
    });
  }

  if (logFlick) console.log(`Got orderSet Id: ${orderSetId}`);

  const validationResult = await queryContextWithoutAuth.orderFulfillment.validateCourierAssignment(
    orderSetId,
    courierName
  );
  if (validationResult.length > 0) {
    res.statusCode = 400;
    return res.send({
      result: false,
      code: 400,
      message: `Invalid Order: ${orderSetId}.`,
    });
  }
  // If everything's OK, update the order fullfillment
  await queryContextWithoutAuth.orderFulfillment.assignDeliveryInfoByOrderSetId(
    orderSetId,
    {
      lastUpdated,
      deliveryStatus,
      deliveredAt,
    }
  );

  if (deliveryStatus.trim() === 'delivered') {
    if (logFlick) console.log('Changing order status to COMPLETED.');
    await queryContextWithoutAuth.orderSetStatus.setStatusForOrderSetId(
      orderSetId,
      orderSetStatusNames.COMPLETED,
      queryContextWithoutAuth
    );
    await publishSubscriptionEvent(
      queryContextWithoutAuth,
      orderSetId,
      orderSetSubscriptionEvent.ORDER_SET_UPDATED
    );
  }

  res.statusCode = 200;
  return res.send({
    result: true,
    code: 200,
    message: `OrderSet ID ${orderSetId} updated.`,
  });
};
