const express = require('express');
const { paymentProviders } = require('../payment-service/enums');
const { getModelNameByType } = require('../lib/util');
const SlackWebHookManager = require(
  '../schema/slack-webhook-manager/slack-webhook-manager'
);
const router = express.Router();
const { ecommerce, saveCardUrls } = require('../../config');
const axiosAdapter = require('../lib/axios-adapter');

router.route('/:countryCode/payment-callback').get(async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  context.req.clientPlatform = 'mobile';
  const countryCode = req.params.countryCode.toUpperCase();
  const psResponse = await context.paymentService.paymentStatus(
    paymentProviders.TAP,
    {
      id: req.query['tap_id'],
      countryCode,
    }
  );
  if (psResponse.error) {
    return res.send(psResponse.error);
  }

  if (psResponse.orderType === 'ECOM') {
    let ecomResponse = await axiosAdapter.send({
      path: `${ecommerce.paymentTapCallback}?cko-session-id=${req.query['tap_id']}&countryCode=${countryCode}`,
      method: 'POST',
      params: psResponse,
    });
    ecomResponse = ecomResponse.data;
    const redirectLink = `${ecomResponse.data.redirect}?trackid=${ecomResponse.data.trackid}`;
    return res.redirect(redirectLink);
  }

  await context.paymentService.paymentProviders[paymentProviders.TAP]
    .saveCustomerToken(countryCode, psResponse.rawResponse);

  const modelName = getModelNameByType(psResponse.orderType);
  const resolvedPayment = await context[modelName]
    .resolvePaymentCallback(psResponse);

  return res.redirect(
    `${resolvedPayment.redirect}?trackid=${resolvedPayment.trackid}`
  );
});

router.route('/:countryCode/card-verification-callback')
  .get(async (req, res) => {
    const { queryContextWithoutAuth: context } = req.app;
    const countryCode = req.params.countryCode.toUpperCase();
    try {
      const saveCardResponse = await context.paymentService.getSaveCardStatus(
        paymentProviders.TAP,
        {
          id: req.query['tap_id'],
          countryCode,
        }
      );
      if (!saveCardResponse) {
        throw new Error('Save Card Response Cannot Be Null or Undefined');
      }
      if (saveCardResponse.status === 'VALID') {
        const cardId = await context.paymentService.paymentProviders[
          paymentProviders.TAP
        ].saveCard({
          countryCode,
          customerId: saveCardResponse.metadata.customerId,
          saveCardResponse
        });
        context.kinesisLogger.sendLogEvent(
          {
            countryCode,
            id: req.query['tap_id'],
            saveCardResponse,
          },
          'tap-cardSave-success'
        ).catch(error => console.error(error));
        return res.redirect(`${saveCardUrls.successUrl}?card-id=${cardId}`);
      }
      throw new Error(
        'Save Card Response is not Approved or Status is Not Correct'
      );
    } catch (err) {
      await context.kinesisLogger.sendLogEvent(
        {
          countryCode,
          id: req.query['tap_id'],
          error: err,
        },
        'tap-cardSave-fail'
      );
      return res.redirect(saveCardUrls.errorUrl);
    }
  });

router.route('/:countryCode/webhook').post(async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  const countryCode = req.params.countryCode.toUpperCase();
  const transactionData = req.body.Data;

  const psResponse = await context.paymentService.paymentStatus(
    paymentProviders.TAP,
    {
      id: req.body.id,
      countryCode,
    }
  );
  if (psResponse.error) {
    SlackWebHookManager.sendTextToSlack(
      'TAP Webhook Payment Status Error, paymentId : ' +
      JSON.stringify({
        foundBody: req.body,
        paymentResponse: psResponse,
      })
    ).catch(err => console.error(err));
    return res.status(400).json({
      message: 'Something went wrong',
    });
  }

  const orderReference = transactionData?.rawResponse?.reference || null;
  if (orderReference !== null) {
    const [refOrderType] = orderReference.split('#');
    if (refOrderType === 'ECOM') {
      await axiosAdapter.send({
        path: ecommerce.paymentWebhook,
        method: 'POST',
        params: req.body.data
      });
      return res
        .status(200)
        .json({ message: 'Checkout Webhook Processed Successfully' });
    }
  }

  await context.paymentService.paymentProviders[paymentProviders.TAP]
    .saveCustomerToken(countryCode, psResponse.rawResponse);

  const modelName = getModelNameByType(psResponse.orderType);
  await context[modelName].resolvePaymentCallback(psResponse);

  return res.status(200).json({
    message: 'Successfully processed'
  });
});

module.exports = router;
