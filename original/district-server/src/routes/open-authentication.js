const express = require('express');
const { verifyCustomerToken, getCustomerDetails, sendMpNotifications, sendMpSlackNotifications, sendMpSmsNotifications } = require('../controllers/open-auth-controller');
const { getPaymentMethods, getWalletAccount, createTx } = require('../controllers/payment-controller');
const { customerOtp, validateCustomerOtp, availableCountries } = require('../controllers/customer-auth-controller');
const { serviceExchangeKey } = require('../../config');

// eslint-disable-next-line new-cap
const router = express.Router();

/*
 * This services are already created on graphql.
 * Because of the FE request they were created also here.
 * If necessary you can look blogCategories, blogCategory,
 * blogCategory[Create, Update, Delete], blogPosts, blogPost
 * and blogPost[Create, Update, Delete] in graphql.
 * */

const verifyServiceKey = async (req, res, next) => {

  const serviceKey = req.headers['service-exchange-key'];

  if (serviceKey && serviceKey === serviceExchangeKey) {
    return next();
  } else {
    return res.status(401).send({
      error: 'Unauthorized',
    });
  }
};

router.post('/auth', verifyServiceKey, verifyCustomerToken);

router.post('/get-customer-info', verifyServiceKey, getCustomerDetails);

router.post('/get-payment-methods', verifyServiceKey, getPaymentMethods);

router.post('/get-wallet-account', verifyServiceKey, getWalletAccount);

router.post('/send-notification', verifyServiceKey, sendMpNotifications);

router.post('/send-slack-notification', verifyServiceKey, sendMpSlackNotifications);

router.post('/send-sms-notification', verifyServiceKey, sendMpSmsNotifications);

router.post('/pay', verifyServiceKey, createTx);

router.post('/customer-otp', verifyServiceKey, customerOtp);

router.post('/validate-otp', verifyServiceKey, validateCustomerOtp);

router.get('/otp-available-countries', verifyServiceKey, availableCountries);

module.exports = router;
