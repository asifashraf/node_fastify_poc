const express = require('express');
const { get } = require('lodash');
const { publishVerifiedEmailToBraze } = require('../lib/braze');

// eslint-disable-next-line new-cap
const router = express.Router();

router.route('/verify-email').get(async (req, res) => {
  // This adjust deeplink opens the application if installed , opens app store if not
  const appDeepLink = 'https://87df.adj.st/appopen?adj_t=1n4orjw';

  const { queryContextWithoutAuth: context } = req.app;
  const customerId = get(req.query, 'cid', null);

  try {
    const customerEmailVerified = await context.customer.verifyCustomerEmailById(
      customerId
    );
    if (customerEmailVerified) {
      const customerWithId = await context.customer.getById(customerId);
      if (customerWithId) {
        publishVerifiedEmailToBraze(
          {
            customerId: customerWithId.id,
            email: customerWithId.email,
            // eslint-disable-next-line camelcase
            new_offers: customerWithId.newOffers,
            // eslint-disable-next-line camelcase
            allow_sms: customerWithId.allowSms,
            // eslint-disable-next-line camelcase
            allow_email: customerWithId.allowEmail,
          },
          null
        );
      }
      return res.redirect(301, appDeepLink);
    }
    return res.redirect(400, appDeepLink);
  } catch (err) {
    const { stack, message } = err || {};
    context.kinesisLogger.sendLogEvent({ stack, message }, 'route-verify-email-error');
    return res.status(500).end();
  }
});

module.exports = router;
