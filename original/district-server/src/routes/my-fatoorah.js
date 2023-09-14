const express = require('express');
const { get } = require('lodash');

const mf = require('../lib/my-fatoorah');
const SlackWebHookManager = require('../schema/slack-webhook-manager/slack-webhook-manager');
const { paymentSchemes } = require('../payment-service/enums');
const { kinesisEventTypes } = require('../lib/aws-kinesis-logging');
const { getModelNameByType } = require('../lib/util');
const axiosAdapter = require('../lib/axios-adapter');
const {ecommerce} = require('../../config');

// eslint-disable-next-line new-cap
const router = express.Router();

const myFatoorahEventTypes = {
  TransactionsStatusChanged: 1,
  RefundStatusChanged: 2,
  BalanceTransferred: 3,
  SupplierStatusChanged: 4
};

router.route('/webhook').post(async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  const { db } = req.app.queryContextWithoutAuth;
  console.log('MyFatoorah Webhook Transaction Updated : ', req.body);
  const transactionData = req.body.Data;

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

  // we don't process the refund process is our end
  // refund process is doing by the care/finance team manually
  if (req.body.EventType === myFatoorahEventTypes.RefundStatusChanged) {
    await context.kinesisLogger.sendLogEvent(
      {
        requestBody: req.body
      },
      kinesisEventTypes.myFatoorahWebhookRefundEvent
    );
    return res.status(200).json({ message: 'Webhook Processed Successfully' });
  }

  if (!transactionData) {
    console.log('Transaction Data is missing from Webhook Body : ', req.body);
    SlackWebHookManager.sendTextToSlack(
      'MyFatoorah Webhook Transaction Data Missing : ' + req.body
    );
    await context.kinesisLogger.sendLogEvent(
      {
        message: 'Transaction Data is missing from Webhook Body',
        foundBody: req.body,
      },
      kinesisEventTypes.myFatoorahWebhookIncompleteBodyEvent
    );
    return res.status(400).json({
      message: 'Transaction Data is missing from Webhook Body',
      foundBody: req.body,
    });
  }

  // Sanity check
  if (
    !transactionData.PaymentId &&
    !transactionData.InvoiceId &&
    !transactionData.DisplayCurrency
  ) {
    console.log(
      'Transaction Data is missing PaymentId, InvoiceId and PayCurrency no usable id or currency found',
      req.body
    );
    await context.kinesisLogger.sendLogEvent(
      {
        message:
          'Transaction Data is missing PaymentId, InvoiceId and PayCurrency no usable id or currency found',
        foundBody: req.body,
      },
      kinesisEventTypes.myFatoorahWebhookIncompleteBodyEvent
    );
    SlackWebHookManager.sendTextToSlack(
      'MyFatoorah Webhook Transaction Data Missing Params : ' + req.body
    );
    return res.status(400).json({
      message:
        'Transaction Data is missing PaymentId, InvoiceId and PayCurrency no usable id or currency found',
      foundBody: req.body,
    });
  }

  let transactionId = get(transactionData, 'PaymentId', null);
  let keyType = 'PaymentId';

  if (transactionId === null) {
    transactionId = get(transactionData, 'InvoiceId', null);
    keyType = 'InvoiceId';
  }
  try {
    const currencyCode = get(transactionData, 'DisplayCurrency', null);
    const currency = await context.currency.getByCode(currencyCode);
    const country = await context.currency.getCountry(currency.id);

    // use PaymentId as default for query, alternative InvoiceId
    const psResponse = await mf.paymentEnquiry(db, {
      id: transactionId,
      type: keyType,
      currencyCode,
      countryCode: country.isoCode,
    });

    if (psResponse.error) {
      console.log('MyFatoorah Webhook psResponse error : ', psResponse);
      SlackWebHookManager.sendTextToSlack(
        'MyFatoorah Webhook psResponse error : ' +
          psResponse +
          ' transactionId : ' +
          transactionId +
          ' error : ' +
          psResponse.error
      );
      await context.kinesisLogger.sendLogEvent(
        {
          countryCode: country.isoCode,
          currencyCode,
          paymentId: transactionId,
          paymentResponse: psResponse,
        },
        kinesisEventTypes.myFatoorahWebhookFailEvent
      );
      return res.status(500).send(psResponse.error);
    }

    psResponse.myFatoorahPaymentId = psResponse.id;
    delete psResponse.id;

    const modelName = getModelNameByType(psResponse.orderType);

    const resolvedPayment = await context[modelName].resolvePaymentCallback(
      psResponse
    );
    await context.kinesisLogger.sendLogEvent(
      {
        countryCode: country.isoCode,
        currencyCode,
        paymentId: transactionId,
        paymentResponse: psResponse,
        resolvedPayment,
      },
      kinesisEventTypes.myFatoorahWebhookSuccessEvent
    );
    console.log('MyFatoorah Webhook Processed Successfully');
    return res.status(200).json({ message: 'Webhook Processed Successfully' });
  } catch (err) {
    SlackWebHookManager.sendTextToSlack(`
      MyFatoorah Webhook Unknown Fail!,
      parameters -> ${JSON.stringify(req.body)}
      err -> ${JSON.stringify(err)}
      place -> 'src/routes/my-fatoorah.js:147',
    `);
    await context.kinesisLogger.sendLogEvent(
      {
        paymentId: transactionId,
        requestBody: req.body,
        errorContent: err,
      },
      kinesisEventTypes.myFatoorahWebhookFailEvent
    );
    return res
      .status(500)
      .json({ message: 'MyFatoorah Webhook Unknown Failure' });
  }
});

router
  .route('/:countryCode/:currencyCode/payment-callback')
  .get(async (req, res) => {
    const { queryContextWithoutAuth: context } = req.app;
    context.req.clientPlatform = 'mobile';
    const { db } = req.app.queryContextWithoutAuth;
    const { countryCode, currencyCode } = req.params;
    const paymentId = get(req.query, 'paymentId', null);
    const keyType = get(req.query, 'keyType', 'PaymentId');
    // use PaymentId as default for query, alternative InvoiceId
    const psResponse = await mf.paymentEnquiry(db, {
      id: paymentId,
      type: keyType,
      currencyCode,
      countryCode,
    });

    if (psResponse.orderType === 'ECOM') {
      let ecomResponse = await axiosAdapter.send({
        path: `${ecommerce.paymentMfCallback}?cko-session-id=${req.query['paymentId']}&countryCode=${countryCode}`,
        method: 'POST',
        params: psResponse,
      });

      ecomResponse = ecomResponse.data;

      const redirectLink = `${ecomResponse.data.redirect}?trackid=${ecomResponse.data.trackid}`;

      return res.redirect(redirectLink);
    }

    psResponse.myFatoorahPaymentId = psResponse.id;
    delete psResponse.id;

    if (psResponse.error) {
      await context.kinesisLogger.sendLogEvent(
        {
          countryCode,
          currencyCode,
          paymentId,
          paymentResponse: psResponse,
        },
        kinesisEventTypes.myFatoorahPaymentCallbackEvent
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
        currencyCode,
        paymentId,
        paymentResponse: psResponse,
        resolvedPayment,
      },
      kinesisEventTypes.myFatoorahPaymentCallbackEvent
    );
    if (resolvedPayment.paymentMethod === paymentSchemes.APPLE_PAY) {
      return res.send({status: 'SUCCESS'});
    }
    const response = `${resolvedPayment.redirect}?trackid=${resolvedPayment.trackid}`;
    res.redirect(response);
    // res.send({ ...psResponse, response });
  });

module.exports = router;
