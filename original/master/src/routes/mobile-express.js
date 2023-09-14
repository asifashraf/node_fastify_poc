const express = require('express');
const { get } = require('lodash');

const { paymentProviders } = require('../payment-service/enums');
const { getModelNameByType } = require('../lib/util');
const { kinesisEventTypes } = require('../lib/aws-kinesis-logging');

// eslint-disable-next-line new-cap
const router = express.Router();

router.route('/payment-callback').get(async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  context.req.clientPlatform = 'mobile';
  const orderId = get(req.query, 'OrderId', null);
  const systemTransId = get(req.query, 'SystemTransId', null);
  // const orderType = get(req.query, 'MerchantCustomField', null);

  const { paymentService } = req.app.queryContextWithoutAuth;
  const psResponse = await paymentService.paymentStatus(
    paymentProviders.MOBILE_EXPRESS,
    {
      mobileExpress: {
        orderId,
        systemTransId,
      },
    }
  );

  psResponse.mobilExpressPaymentId = psResponse.id;
  delete psResponse.id;

  const { queryContextWithoutAuth } = req.app;

  const modelName = getModelNameByType(psResponse.orderType);

  const resolvedPayment = await queryContextWithoutAuth[
    modelName
  ].resolvePaymentCallback(psResponse);

  await context.kinesisLogger.sendLogEvent(
    {
      orderId,
      systemTransId,
      paymentResponse: psResponse,
      resolvedPayment,
    },
    kinesisEventTypes.mobilExpressPaymentCallbackEvent
  );

  const response = `${resolvedPayment.redirect}?trackid=${resolvedPayment.trackid}`;
  // return res.send(response);
  return res.redirect(response);
});

module.exports = router;
