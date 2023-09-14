const querystring = require('querystring');
const express = require('express');
const axios = require('axios');
const { includes, get, toNumber } = require('lodash');

const { ccPayment } = require('../../config');
const { buildAbsoluteUrl, publishSubscriptionEvent } = require('../lib/util');
const {
  paymentStatusName,
  paymentTypes,
  paymentStatusOrderType,
  orderSetSubscriptionEvent,
} = require('../schema/root/enums');

// eslint-disable-next-line new-cap
const router = express.Router();

const orderSetPay = async (req, res) => {
  try {
    const { gatewayUrl, merchant } = ccPayment;
    const { id, type } = req.query;

    const {
      queryContextWithoutAuth: {
        orderSet: orderSetModel,
        paymentStatus: paymentStatusModel,
        currency: currencyModel,
      },
    } = req.app;
    const orderSet = await orderSetModel.getById(id);

    if (!orderSet) {
      return res.status(404).send('invalid order');
    }

    const paymentStatuses = await paymentStatusModel.getAllByOrderSetId(id);
    const paymentStatus = paymentStatuses
      .filter(ps => ps.name === paymentStatusName.PAYMENT_PENDING)
      .shift();

    const returnUrl = buildAbsoluteUrl('/pay/done', {
      id,
      type,
      ref: orderSet.shortCode,
    });

    let currency = {};
    if (orderSet.currencyId) {
      currency = await currencyModel.getById(orderSet.currencyId);
    }

    if (!currency.code) {
      currency = await currencyModel.getByCode();
    }

    const data = {
      apiOperation: 'CREATE_CHECKOUT_SESSION',
      apiPassword: merchant.password,
      'interaction.returnUrl': returnUrl,
      'interaction.cancelUrl': `${returnUrl}&canceled=true`,
      apiUsername: `merchant.${merchant.id}`,
      merchant: merchant.id,
      'order.id': orderSet.id,
      'order.reference': orderSet.shortCode,
      'order.amount': orderSet.total,
      'order.currency': currency.isoCode,
    };

    const gatewayResponse = await axios.post(
      `${gatewayUrl}/api/nvp/version/51`,
      querystring.stringify(data)
    );
    const { data: rawResponse } = gatewayResponse;
    const parsedResponse = querystring.parse(rawResponse);
    // console.log(parsedResponse);
    const {
      successIndicator,
      'session.id': sessionId,
      'session.version': sessionVersion,
    } = parsedResponse;
    await paymentStatusModel.save({
      id: paymentStatus.id,
      rawResponse: JSON.stringify(parsedResponse),
      paymentType: paymentTypes.MASTERCARD_CHECKOUT,
      mastercardSessionId: sessionId,
      mastercardSessionVersion: sessionVersion,
      mastercardSuccessIndicator: successIndicator,
    });
    return res.render('pay', {
      type: 'HOSTED_CHECKOUT',
      order: {
        id: orderSet.id,
        description: `Order - ${orderSet.shortCode}`,
        total: orderSet.total,
        currency: currency.code,
      },
      gatewayUrl,
      merchant,
      sessionId,
      sessionVersion,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send('Oops something went wrong!');
  }
};

const creditsOrderPay = async (req, res) => {
  try {
    const { gatewayUrl, merchant } = ccPayment;
    const { id, type } = req.query;

    const {
      queryContextWithoutAuth: {
        loyaltyOrder: creditsOrderModel,
        paymentStatus: paymentStatusModel,
        currency: currencyModel,
      },
    } = req.app;

    const creditsOrder = await creditsOrderModel.getById(id);

    if (!creditsOrder) {
      return res.status(404).send('invalid credits order');
    }

    const paymentStatuses = await paymentStatusModel.getAllByCreditsOrderId(id);
    const paymentStatus = paymentStatuses
      .filter(ps => ps.name === paymentStatusName.PAYMENT_PENDING)
      .shift();

    const reference = `CREDITS_${creditsOrder.sku}`;
    const returnUrl = buildAbsoluteUrl('/pay/done', {
      id,
      type,
      ref: reference,
    });

    let currency = {};
    if (creditsOrder.currencyId) {
      currency = await currencyModel.getById(creditsOrder.currencyId);
    }

    if (!currency.code) {
      currency = await currencyModel.getByCode();
    }

    const data = {
      apiOperation: 'CREATE_CHECKOUT_SESSION',
      apiPassword: merchant.password,
      'interaction.returnUrl': returnUrl,
      'interaction.cancelUrl': `${returnUrl}&canceled=true`,
      apiUsername: `merchant.${merchant.id}`,
      merchant: merchant.id,
      'order.id': creditsOrder.id,
      'order.reference': reference,
      'order.amount': creditsOrder.amount,
      'order.currency': currency.isoCode,
    };

    const gatewayResponse = await axios.post(
      `${gatewayUrl}/api/nvp/version/51`,
      querystring.stringify(data)
    );
    const { data: rawResponse } = gatewayResponse;
    const parsedResponse = querystring.parse(rawResponse);
    // console.log(parsedResponse);
    const {
      successIndicator,
      'session.id': sessionId,
      'session.version': sessionVersion,
    } = parsedResponse;
    await paymentStatusModel.save({
      id: paymentStatus.id,
      rawResponse: JSON.stringify(parsedResponse),
      paymentType: paymentTypes.MASTERCARD_CHECKOUT,
      mastercardSessionId: sessionId,
      mastercardSessionVersion: sessionVersion,
      mastercardSuccessIndicator: successIndicator,
    });
    return res.render('pay', {
      type: 'HOSTED_CHECKOUT',
      order: {
        id: creditsOrder.id,
        description: `Credits Order - ${creditsOrder.sku}`,
        total: creditsOrder.amount,
        currency: currency.code,
      },
      gatewayUrl,
      merchant,
      sessionId,
      sessionVersion,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send('Oops something went wrong!');
  }
};

router.route('/').get(async (req, res) => {
  const { id = null, type = null } = req.query;
  if (!id || !type || (type && !includes(paymentStatusOrderType, type))) {
    return res.status(404).send('invalid order or type');
  }
  switch (type) {
    case paymentStatusOrderType.ORDER_SET:
      return orderSetPay(req, res);
    case paymentStatusOrderType.LOYALTY_ORDER:
      return creditsOrderPay(req, res);
    default:
      return res.send('payment not implemented');
  }
});

const orderSetPayDone = async (req, res) => {
  try {
    const { id, resultIndicator } = req.query;

    const { queryContextWithoutAuth } = req.app;
    const {
      orderSet: orderSetModel,
      paymentStatus: paymentStatusModel,
      brandLocation: brandLocationModel,
      customerStats: customerStatsModel,
    } = queryContextWithoutAuth;
    const orderSet = await orderSetModel.getById(id);

    if (!orderSet) {
      return res.status(404).send('invalid order');
    }

    const paymentStatuses = await paymentStatusModel.getAllByOrderSetId(id);
    const successPaymentStatus = paymentStatuses
      .filter(ps => ps.name === paymentStatusName.PAYMENT_SUCCESS)
      .shift();
    const pendingPaymentStatus = paymentStatuses
      .filter(ps => ps.name === paymentStatusName.PAYMENT_PENDING)
      .shift();

    let redirectUrl = null;
    if (pendingPaymentStatus.mastercardSuccessIndicator === resultIndicator) {
      // payment ok
      redirectUrl = orderSet.receiptUrl;
      if (successPaymentStatus) {
        console.log(
          `success payment ${successPaymentStatus.id} already processed`
        );
      } else {
        await paymentStatusModel.save({
          referenceOrderId: id,
          orderType: paymentStatusOrderType.ORDER_SET,
          name: paymentStatusName.PAYMENT_SUCCESS,
          rawResponse: JSON.stringify(req.query),
        });

        const brandLocation = await brandLocationModel.getById(
          orderSet.brandLocationId
        );

        const flickEnabled = Number(get(brandLocation, 'flickStoreId', 0)) > 0;

        // await orderSetStatusModel.setStatusForOrderSetId(
        //   id,
        //   orderSetStatusNames.PAYMENT_COMPLETE
        // );

        await publishSubscriptionEvent(
          queryContextWithoutAuth,
          id,
          orderSetSubscriptionEvent.ORDER_SET_CREATED
        );

        // Create Flick Order for orderSetId
        if (flickEnabled) {
          await orderSetModel.createFlickOrder(id);
        }
        // Update Customer Stats
        await customerStatsModel.increment(orderSet.customerId, {
          totalOrders: 1,
          totalKdSpent: orderSet.total,
        });
      }
    } else {
      // payment not ok
      redirectUrl = orderSet.errorUrl;
      await paymentStatusModel.save({
        referenceOrderId: id,
        orderType: paymentStatusOrderType.ORDER_SET,
        name: paymentStatusName.PAYMENT_FAILURE,
        rawResponse: JSON.stringify(req.query),
      });

      // Moved in payment-status
      // await queryContextWithoutAuth.withTransaction(
      //   'customerUsedPerk',
      //   'changeUsedPerksStatus',
      //   id,
      //   0
      // );
    }

    return res.redirect(`${redirectUrl}?trackid=${id}`);
  } catch (err) {
    console.log(err);
    return res.status(500).send('Oops something went wrong!');
  }
};

const creditsOrderPayDone = async (req, res) => {
  try {
    const { id, resultIndicator } = req.query;

    const { queryContextWithoutAuth } = req.app;
    const {
      loyaltyOrder: creditsOrderModel,
      paymentStatus: paymentStatusModel,
      loyaltyTransaction: creditsTransactionModel,
    } = queryContextWithoutAuth;
    const creditsOrder = await creditsOrderModel.getById(id);

    if (!creditsOrder) {
      return res.status(404).send('invalid credits order');
    }

    const paymentStatuses = await paymentStatusModel.getAllByCreditsOrderId(id);
    const successPaymentStatus = paymentStatuses
      .filter(ps => ps.name === paymentStatusName.PAYMENT_SUCCESS)
      .shift();
    const pendingPaymentStatus = paymentStatuses
      .filter(ps => ps.name === paymentStatusName.PAYMENT_PENDING)
      .shift();

    let redirectUrl = null;
    if (pendingPaymentStatus.mastercardSuccessIndicator === resultIndicator) {
      // payment ok
      redirectUrl = creditsOrder.receiptUrl;
      if (successPaymentStatus) {
        console.log(
          `success payment ${successPaymentStatus.id} already processed`
        );
      } else {
        await paymentStatusModel.save({
          referenceOrderId: id,
          orderType: paymentStatusOrderType.LOYALTY_ORDER,
          name: paymentStatusName.PAYMENT_SUCCESS,
          rawResponse: JSON.stringify(req.query),
        });

        const { customerId, amount, bonus } = creditsOrder;
        const credit = toNumber(amount) + toNumber(bonus);
        await creditsTransactionModel.credit(
          id,
          paymentStatusOrderType.LOYALTY_ORDER,
          customerId,
          credit,
          creditsOrder.currencyId
        );
        // await customerModel.assignLoyaltyTierBySku(customerId, sku);
      }
    } else {
      // payment not ok
      redirectUrl = creditsOrder.errorUrl;
      await paymentStatusModel.save({
        referenceOrderId: id,
        orderType: paymentStatusOrderType.LOYALTY_ORDER,
        name: paymentStatusName.PAYMENT_FAILURE,
        rawResponse: JSON.stringify(req.query),
      });
    }

    return res.redirect(`${redirectUrl}?trackid=${id}`);
  } catch (err) {
    console.log(err);
    return res.status(500).send('Oops something went wrong!');
  }
};

router.route('/done').get(async (req, res) => {
  const { id = null, type = null } = req.query;
  if (!id || !type || (type && !includes(paymentStatusOrderType, type))) {
    return res.status(404).send('invalid order or type');
  }
  switch (type) {
    case paymentStatusOrderType.ORDER_SET:
      return orderSetPayDone(req, res);
    case paymentStatusOrderType.LOYALTY_ORDER:
      return creditsOrderPayDone(req, res);
    default:
      return res.send('payment not implemented');
  }
});

module.exports = router;
