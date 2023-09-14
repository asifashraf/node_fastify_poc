const express = require('express');
// const deliverectService = require('../lib/menu-integration-services')('deliverect');
// const otterService = require('../lib/menu-integration-services')('otter');
// const menuIntegrationServices = require('../lib/menu-integration-services');

// eslint-disable-next-line new-cap
const router = express.Router();

router.route('/webhook/:service').post(async (req, res) => {
  try {
    console.log('Menu Integration Webhook body : ', req.body);
    console.log('menu-integration > router.route > req.params:', req.params);
    const { service } = req.params;
    const { queryContextWithoutAuth: context } = req.app;
    const menuIntegrationServices = context.menuIntegrationServices();

    if (service === 'deliverect') {
      menuIntegrationServices.deliverect
        .menuWebhook(context, req.body)
        .then((res) => {
          console.log('menu-integration.js > router.route > deliverect > res:', res);
          return;
        })
        .catch((err) => {
          console.log('menu-integration.js > router.route > err:', err);
        });
    } else if (service === 'otter') {
      menuIntegrationServices.otter
        .menuWebhook(context, req.body)
        .then((res) => {
          console.log('menu-integration.js > router.route > otter > res:', res);
          return;
        })
        .catch((err) => {
          console.log('menu-integration.js > router.route > err:', err);
        });
      //   otterService
      //     .menuWebhook(context, req.body)
      //     .then((res) => {
      //       console.log('menu-integration.js > router.route > otter > res:', res);
      //       return;
      //     })
      //     .catch((err) => {
      //       console.log('menu-integration.js > router.route > err:', err);
      //     });
    }

    console.log('Menu Integration Webhook Processed Successfully');
    return res.status(200).json({ message: 'Webhook Processed Successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Menu Integration Webhook Unknown Failure' });
  }
});

module.exports = router;
