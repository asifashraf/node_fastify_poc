const express = require('express');
const { ecommerce } = require('../../config');
const { kinesisEventTypes } = require('../lib/aws-kinesis-logging');
const { paymentProviders } = require('../payment-service/enums');
const { getModelNameByType } = require('../lib/util');
const { saveCardUrls } = require('../../config');
const axiosAdapter = require('../lib/axios-adapter');
const SlackWebHookManager = require('../schema/slack-webhook-manager/slack-webhook-manager');
const { paymentStatusOrderType } = require('../schema/root/enums');

// eslint-disable-next-line new-cap
const router = express.Router();

router.route('/webhook').all(async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  await context.kinesisLogger.sendLogEvent(
    {
      foundBody: req.body,
    },
    kinesisEventTypes.checkoutComPaymentWebhookTriggeredEvent
  );
  const { paymentService } = req.app.queryContextWithoutAuth;
  const paymentData = req.body.data;

  const orderReference = paymentData?.rawResponse?.reference || null;

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

  const paymentId = paymentData.id;
  const paymentCurrency = paymentData.currency;
  if (!paymentData || !paymentId || !paymentCurrency) {
    await context.kinesisLogger.sendLogEvent(
      {
        foundBody: req.body,
      },
      kinesisEventTypes.checkoutComPaymentWebhookIncompleteBody
    );
    SlackWebHookManager.sendTextAndErrorToSlack(
      'Checkout.com Data is missing from Webhook Body' + paymentId,
      paymentData
    );
    return res.status(400).json({
      message: 'Checkout.com Data is missing from Webhook Body',
      foundBody: req.body,
    });
  }
  // This is just a hotfix, server keeps country code in 2-char format, but currency code as 3-char
  // checkout uses separate client for kwd, and another one for others
  let targetCountryCode;
  switch (paymentCurrency) {
    case 'KWD': {
      targetCountryCode = 'KW';
      break;
    }
    case 'SAR': {
      targetCountryCode = 'SA';
      break;
    }
    case 'AED': {
      targetCountryCode = 'AE';
      break;
    }
    case 'EGP': {
      targetCountryCode = 'EG';
      break;
    }
    default: {
      targetCountryCode = 'AE';
      break;
    }
  }
  try {
    const psResponse = await paymentService.paymentStatus(
      paymentProviders.CHECKOUT,
      {
        id: paymentId,
        countryCode: targetCountryCode,
      }
    );
    psResponse.checkoutComPaymentId = psResponse.id;
    delete psResponse.id;

    if (psResponse.error) {
      await context.kinesisLogger.sendLogEvent(
        {
          paymentId,
          foundBody: paymentData,
          paymentResponse: psResponse,
        },
        kinesisEventTypes.checkoutCardSaveCallbackFail
      );
      SlackWebHookManager.sendTextToSlack(
        'Checkout.com Webhook Payment Status Error, paymentId : ' +
          paymentId +
          ' ' +
          JSON.stringify({
            foundBody: req.body,
            paymentData,
            paymentResponse: psResponse,
          })
      );
      return res.status(400).json({
        message: 'Checkout.com Webhook Payment Status Error',
        paymentResponse: psResponse,
        foundBody: req.body,
      });
    }

    if (psResponse.orderType === 'SAVE_CARD') {
      /**
       * TODO: let's see how could process save card webhook
       * there is no any record for the save card till card saved
       * that's why we need to watch it for a while.
       * according to investigated logs, customers do not complete verification
       */
      context.kinesisLogger.sendLogEvent(
        {
          paymentId,
          paymentResponse: psResponse,
          foundBody: paymentData,
          requestQuery: req.query,
        },
        kinesisEventTypes.checkoutCardSaveWebhook
      ).catch(err => console.log(err));
      return res
        .status(200)
        .json({ message: 'Checkout Webhook Processed Successfully' });
    }

    const modelName = getModelNameByType(psResponse.orderType);

    const resolvedPayment = await context[modelName].resolvePaymentCallback(
      psResponse
    );

    await context.kinesisLogger.sendLogEvent(
      {
        paymentId,
        paymentResponse: psResponse,
        foundBody: paymentData,
        resolvedPayment,
      },
      kinesisEventTypes.checkoutComPaymentWebhookSuccess
    );
    return res
      .status(200)
      .json({ message: 'Checkout Webhook Processed Successfully' });
  } catch (err) {
    await context.kinesisLogger.sendLogEvent(
      {
        paymentId,
        foundBody: paymentData,
        errorBody: err,
      },
      kinesisEventTypes.checkoutCardSaveCallbackFail
    );
    SlackWebHookManager.sendTextAndErrorToSlack(
      'Checkout Webhook Failed : ',
      { reference: paymentData.reference }
    );
    return res.status(500).json({
      message: 'Checkout.com Webhook Generic Error',
      caughtError: err,
      foundBody: req.body,
    });
  }
});

router.route('/:countryCode/payment-callback').get(async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  context.req.clientPlatform = 'mobile';
  const { paymentService } = req.app.queryContextWithoutAuth;
  const { countryCode } = req.params;
  const psResponse = await paymentService.paymentStatus(
    paymentProviders.CHECKOUT,
    {
      id: req.query['cko-session-id'],
      countryCode,
    }
  );

  if (psResponse.orderType === 'ECOM') {
    let ecomResponse = await axiosAdapter.send({
      path: `${ecommerce.paymentCallback}?cko-session-id=${req.query['cko-session-id']}&countryCode=${countryCode}`,
      method: 'POST',
      params: psResponse,
    });

    ecomResponse = ecomResponse.data;

    const redirectLink = `${ecomResponse.data.redirect}?trackid=${ecomResponse.data.trackid}`;

    return res.redirect(redirectLink);
  }

  psResponse.checkoutComPaymentId = psResponse.id;
  delete psResponse.id;

  if (psResponse.error) {
    await context.kinesisLogger.sendLogEvent(
      {
        countryCode,
        id: req.query['cko-session-id'],
        paymentResponse: psResponse,
      },
      kinesisEventTypes.checkoutComPaymentCallbackEvent
    );
    return res.send(psResponse.error);
  }

  const { queryContextWithoutAuth } = req.app;

  const modelName = getModelNameByType(psResponse.orderType);

  const resolvedPayment = await queryContextWithoutAuth[
    modelName
  ].resolvePaymentCallback(psResponse);

  await context.kinesisLogger.sendLogEvent(
    {
      countryCode,
      id: req.query['cko-session-id'],
      paymentResponse: psResponse,
      resolvedPayment,
    },
    kinesisEventTypes.checkoutComPaymentCallbackEvent
  );

  const response = `${resolvedPayment.redirect}?trackid=${resolvedPayment.trackid}`;
  // return res.send(response);
  return res.redirect(response);
});

router
  .route('/:countryCode/card-verification-callback')
  .get(async (req, res) => {
    const { queryContextWithoutAuth: context } = req.app;
    const { paymentService } = req.app.queryContextWithoutAuth;
    const { countryCode } = req.params;
    try {
      const saveCardResponse = await paymentService.getSaveCardStatus(
        paymentProviders.CHECKOUT,
        {
          id: req.query['cko-session-id'],
          countryCode,
        }
      );
      console.log(
        'saveCardResponse.paymentResponse : ',
        saveCardResponse.paymentResponse
      );
      if (!saveCardResponse) {
        throw new Error('Save Card Response Cannot Be Null or Undefined');
      }
      if (
        saveCardResponse.paymentResponse.approved === true &&
        saveCardResponse.paymentResponse.status === 'Authorized'
      ) {
        saveCardResponse.paymentResponse.saveCardResponseId =
          saveCardResponse.paymentResponse.id;
        delete saveCardResponse.paymentResponse.id;
        const cardId = await paymentService.paymentProviders[
          paymentProviders.CHECKOUT
        ].saveCard({
          data: saveCardResponse.paymentResponse,
          customerId: saveCardResponse.customerId,
        });
        paymentService.cancelAuthorizedPayment(
          paymentProviders.CHECKOUT,
          {
            countryCode,
            orderType: paymentStatusOrderType.SAVE_CARD,
            referenceOrderId: saveCardResponse.customerId,
            providerPaymentId:
              saveCardResponse.paymentResponse.saveCardResponseId
          }
        ).catch(error => console.error(error));
        await context.kinesisLogger.sendLogEvent(
          {
            countryCode,
            id: req.query['cko-session-id'],
            saveCardResponse,
          },
          kinesisEventTypes.checkoutCardSaveCallbackSuccess
        );
        const response = `${saveCardUrls.successUrl}?card-id=${cardId}`;
        // return res.send(response);
        return res.redirect(response);
      }
      throw new Error(
        'Save Card Response is not Approved or Status is Not Correct'
      );
    } catch (err) {
      console.log('Checkout Save Card Callback Error : ', err);
      await context.kinesisLogger.sendLogEvent(
        {
          countryCode,
          id: req.query['cko-session-id'],
          error: err,
        },
        kinesisEventTypes.checkoutCardSaveCallbackFail
      );
      const failureLink = saveCardUrls.errorUrl;
      return res.redirect(failureLink);
    }
  });

module.exports = router;
