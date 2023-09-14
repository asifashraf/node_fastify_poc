const express = require('express');

// eslint-disable-next-line new-cap
const router = express.Router();

router.route('/expire-cashback-and-referrals').get(async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;

  const response = await context.walletAccount.expireForAllCustomers();

  return res.send(response);
});

module.exports = router;
