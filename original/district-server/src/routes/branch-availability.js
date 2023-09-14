const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const {branchAvailability} = require('../../config');

const apiKeyCheck = (req, res, next) => {
  if (
    req.headers['api-key'] !== branchAvailability.restEndpointsApiKey
    || !req.body.brandLocationIds
  ) {
    return res.status(400).json({status: false, message: 'wrong parameters'});
  }
  next();
};


router.post('/customer-notification-sender', apiKeyCheck, async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  const result = await context.brandLocation.sendCustomerNotificationForBrandLocation(
    req.body.brandLocationIds
  );
  res.json(result);
});

module.exports = router;
