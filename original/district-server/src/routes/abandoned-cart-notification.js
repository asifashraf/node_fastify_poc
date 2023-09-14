const express = require('express');
const { objTransformToCamelCase } = require('../lib/util');
// eslint-disable-next-line new-cap
const router = express.Router();


router.route('/abandoned-cart-notification').post(async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  let { body } = req;
  body = objTransformToCamelCase(body);
  const { basketId, customerId } = body;
  const cartInfo = await context.abandonedCart.getActiveCart({ customerId });
  if (cartInfo && cartInfo.basketId == basketId) {
    const notifs = await context.abandonedCart.abandonedCartNotification(
      basketId,
      customerId,
    );
    const response = await context.notification.createAllIn(notifs);
    context.kinesisLogger.sendLogEvent({ body, message: 'notification sent' }, 'abandoned-cart-notification');
    await context.abandonedCart.updateAfterReminderSent({ id: cartInfo.id, reminderCount: cartInfo.reminderCount });
    return res.send(response);
  }
  context.kinesisLogger.sendLogEvent({ body, message: 'different active basket found' }, 'abandoned-cart-notification');
  return res.send(null);

});


router.route('/abandoned-cart-timeout').post(async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  let { body } = req;
  body = objTransformToCamelCase(body);
  const { basketId, customerId } = body;
  const cartInfo = await context.abandonedCart.getActiveCart({ customerId });
  if (cartInfo && cartInfo.basketId == basketId) {
    const isTimeout = await context.abandonedCart.timeoutCart(
      { basketId }
    );
    context.kinesisLogger.sendLogEvent({ body, message: 'abandoned cart sucsessfully timed out.' }, 'abandoned-cart-timeout');
    return res.send(isTimeout);
  }
  context.kinesisLogger.sendLogEvent({ body, message: 'different active basket found' }, 'abandoned-cart-timeout');
  return res.send(null);

});


module.exports = router;
