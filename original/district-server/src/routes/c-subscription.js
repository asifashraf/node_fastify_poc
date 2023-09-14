const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const {cSubscription} = require('../../config');

const apiKeyCheck = (req, res, next) => {
  if (
    req.headers['api-key'] !== cSubscription.restEndpointsApiKey
    || !req.query.subscriptionCustomerId
  ) {
    return res.status(400).json({status: false, message: 'wrong parameters'});
  }
  next();
};

router.get('/finish-customer-subscription', apiKeyCheck, async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  const result = await context.cSubscriptionCustomer.finishSubscription(
    req.query.subscriptionCustomerId
  );
  if (result.status) {
    context.withTransaction(
      'cSubscriptionCustomerAutoRenewal',
      'renewSubscriptionCustomer',
      req.query.subscriptionCustomerId
    ).catch(err => context.kinesisLogger.sendLogEvent(
      {
        subscriptionCustomerId: req.query.subscriptionCustomerId,
        err: err?.message || err,
      },
      'renew-subscription-customer-failed'
    ));
  }
  res.json(result);
});

router.get('/reminder', apiKeyCheck, async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  const result = await context.cSubscriptionCustomer.sendNotification(
    req.query.subscriptionCustomerId,
    req.query.type,
  );
  res.json(result);
});

module.exports = router;
