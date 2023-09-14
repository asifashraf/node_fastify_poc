const express = require('express');
const SlackWebHookManager = require('../schema/slack-webhook-manager/slack-webhook-manager');
const { arrivedOrderSubscriptionEvent, orderSetStatusNames } = require('../schema/root/enums');
const { publishArrivedOrderSubscriptionEvent } = require('../lib/util');

// eslint-disable-next-line new-cap
const router = express.Router();

const IGNORE_ARRIVED_STATUS = [
  orderSetStatusNames.INITIATED,
  orderSetStatusNames.PLACED,
  orderSetStatusNames.PAYMENT_CANCELED,
  orderSetStatusNames.PAYMENT_FAILURE,
  orderSetStatusNames.COMPLETED
];

router.route('/arrived-notification').post(async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  const { body } = req;
  const { orderSetId, customerId, header } = body;
  if (header != 'IViYXwxeLWy6Ht1E6B8n9RTTb5eJvab0') {
    context.kinesisLogger.sendLogEvent({body, message: 'invalid header'}, 'arrived-notification');
    return res.send(null);
  }
  const arrivingInfo = await context.arrivingTime.getByOrderSetId(orderSetId);
  if (arrivingInfo && !arrivingInfo.arrived) {
    const notifs = await context.arrivingTime.arrivedNotification(
      orderSetId,
      customerId,
    );
    const response = await context.notification.createAllIn(notifs);
    context.kinesisLogger.sendLogEvent({body, message: 'notification sent'}, 'arrived-notification');
    try {
      const { shortCode, currentStatus } = await context.orderSet.getById(orderSetId);
      if (!IGNORE_ARRIVED_STATUS.includes(currentStatus)) {
        const order = {
          brandLocationId: arrivingInfo.branchId,
          orderSetId,
          fulfillmentType: arrivingInfo.fulfillmentType,
          shortCode,
          arrivalTime: arrivingInfo.arrivalTime
        };
        await publishArrivedOrderSubscriptionEvent(
          context,
          order,
          arrivedOrderSubscriptionEvent.ARRIVED_ORDER_FOR_VENDOR
        );
      }
      /**
      * New Barista app has not subscription part. That's why it is removed
      */
      await context.brandLocationDevice.checkAndSendArrivedOrder(arrivingInfo);
    } catch (error) {
      SlackWebHookManager.sendTextToSlack(`[IAMHERE] orderSetId: ${orderSetId}, Error: ${error}`);
    }

    return res.send(response);
  }
  context.kinesisLogger.sendLogEvent({body, message: 'already arrived '}, 'arrived-notification');
  return res.send(null);

});

module.exports = router;
