const { isDev, isProd } = require('../../config');
const firebase = require('../lib/firebase');
const authService = require('../lib/auth-service');
const onlyAuthMiddleware = require('../lib/middlewares/only-auth-middleware');
const mposKinesisLogMiddleware = require('../lib/middlewares/mpos-kinesis-log-middleware');
const expressDeliveryMiddleware = require('../lib/middlewares/express-delivery-auth-middleware');
const { basicAuthMiddleware } = require('../lib/auth');
const { uploadCustomerPhotoByUserId, downloadCustomerPhotoByUserId } = require('../lib/aws-s3');
const {
  exportOrdersReport,
  //   exportQueryTimeLog,
  //   exportBrandsReport,
  //   exportVouchersReport,
  //   exportRewardsReport,
  exportCreditOrdersReport,
  //   exportReferralsReport,
  //   exportBrandLocationsReport,
  //   exportGiftCardOrdersReport,
  //   exportCustomersReport,
  //   exportFinancialReport,
  //   exportStoreOrdersFinancialReport,
  //   exportFinancialReports,
  //   exportFixPlatformModelReport,
} = require('../controllers/report-controller');
// const {
//   syncRevel,
//   syncCustomer,
//   syncNegativeBalanceFix,
// } = require('../controllers/sync-controller');

const {
  versionController,
  appleAppSiteAssociation,
} = require('../controllers/root-controller');

const { renderNonProdEmails } = require('../controllers/render-controller');

const { uploadCoupons } = require('../controllers/upload-controller');

// const {
//   updateRevelOrder,
//   flickOrderUpdate,
// } = require('../controllers/update-controller');

const {
  firebaseGetCustomAuthToken,
} = require('../controllers/auth-controller');
const { triggerInvoiceGenerator } = require('../lib/e-invoice/invoice-trigger');
const { renderConfirmationEmail } = require('../schema/order-set/email-confirmation-renderer');

module.exports = app => {
  app.use((req, res, next) => {
    // console.log(req);
    next();
  });

  app.use('/health-check', (req, res) => {
    return res.send('ok');
  });

  app.use('/VERSION', firebase.middleware, versionController);
  //app.use('/query-time-log', firebase.middleware, exportQueryTimeLog);

  // @TODO: CHECK THIS REVEL!!!
  //app.use('/revel-sync', syncRevel);

  // @TODO: CHECK THIS REVEL!!!
  //app.use('/revel-order-update', updateRevelOrder);

  //app.use('/customer-sync', syncCustomer);

  //app.use('/negative-balance-fix-sync', syncNegativeBalanceFix);

  //app.use('/vouchers-report', firebase.middleware, exportVouchersReport);

  //app.use('/brands-report', firebase.middleware, exportBrandsReport);

  //app.use('/rewards-report', firebase.middleware, exportRewardsReport);

  //app.use('/referrals-report', firebase.middleware, exportReferralsReport);

  app.use('/orders-report', firebase.middlewareForPortal, exportOrdersReport);

  // app.use(
  //   '/fixplatform-report',
  //   firebase.middleware,
  //   exportFixPlatformModelReport
  // );

  app.use(
    '/credit-orders-report',
    firebase.middlewareForPortal,
    exportCreditOrdersReport
  );

  // app.use(
  //   '/brand-locations-report',
  //   firebase.middleware,
  //   exportBrandLocationsReport
  // );

  // app.use(
  //   '/gift-card-orders-report',
  //   firebase.middleware,
  //   exportGiftCardOrdersReport
  // );

  //app.use('/customers-report', firebase.middleware, exportCustomersReport);

  //app.use('/financial-report', firebase.middleware, exportFinancialReport);

  // app.use(
  //   '/store-orders-financial-report',
  //   firebase.middleware,
  //   exportStoreOrdersFinancialReport
  // );

  //app.use('/financial-reports', firebase.middleware, exportFinancialReports);

  app.use('/coupons-upload', firebase.middlewareForPortal, uploadCoupons);

  app.use(
    '/firebase-custom-token',
    firebase.middleware,
    firebaseGetCustomAuthToken
  );

  //app.use('/flick-order-update', flickOrderUpdate);
  app.use('/foodics', require('./foodics'));
  app.use('/pay', require('./pay'));
  app.use('/mf', require('./my-fatoorah'));
  app.use('/cko', require('./checkout.com'));
  app.use('/mobile-express', require('./mobile-express'));
  app.use('/tap', require('./tap'));
  app.use('/cofeapp', require('./cofeapp.com'));
  app.use('/blog', require('./blog'));
  app.use('/crons', require('./crons'));
  app.use('/mpos', mposKinesisLogMiddleware, require('./mpos'));
  app.use('/invoices', require('./invoice'));
  app.use('/i-am-here', require('./arrived-notification'));
  app.use('/image', require('./image-upload'));
  app.use('/feeds', require('./feeds'));
  app.use('/c-subscription', require('./c-subscription'));
  app.use('/open-authentication', require('./open-authentication'));
  app.use('/file', require('./file-upload'));
  app.use('/branch-availability', require('./branch-availability'));
  app.use('/abandoned-cart', require('./abandoned-cart-notification'));
  app.use('/otp-callbacks', require('./otp-callbacks'));
  app.use('/express-delivery', expressDeliveryMiddleware, require('./express-delivery'));
  app.use('/go', require('./go-redirects'));
  app.use('/menu-integration', require('./menu-integration'));

  // This endpoint returns customer's profile picture from S3
  app.post('/profile-picture',
    onlyAuthMiddleware,
    authService.middleware,
    uploadCustomerPhotoByUserId.single('file'),
    function (req, res, next) {
      res.send(true);
    });
  app.get('/profile-picture',
    onlyAuthMiddleware,
    authService.middleware,
    function (req, res, next) {
      if (req.user?.id) {
        downloadCustomerPhotoByUserId(req.user.id, res, next);
      } else {
        next();
      }
    });

  app.use('/manual-invoice/store-order/:storeOrderSetId',
    firebase.middleware,
    async (req, res) => {
      const { queryContextWithoutAuth: context } = req.app;
      const storeOrderSetId = req.params.storeOrderSetId;
      await triggerInvoiceGenerator(context, storeOrderSetId);
      const url = await context.storeOrderSet.getStoreOrderInvoiceURL({ id: storeOrderSetId });
      return res.send(url);
    });

  // IOS Keychain Config
  app.use(
    '/(.well-known/)?apple-app-site-association',
    appleAppSiteAssociation
  );

  // Helper Endpoint for displaying html emails
  if (!isProd) {
    app.use('/render-email', basicAuthMiddleware, renderNonProdEmails);
    app.use('/delete-my-subscription/:customerId', async (req, res) => {
      //TODO: Will remove
      const { queryContextWithoutAuth: context } = req.app;
      const customerId = req.params.customerId;
      await context.db.raw('DELETE FROM subscription_customer_transactions WHERE customer_id=?', [customerId]);
      await context.db.raw('DELETE FROM subscription_customers WHERE customer_id=?', [customerId]);
      await context.db.raw('DELETE FROM subscription_orders WHERE customer_id=?', [customerId]);
      return res.send('deleted');
    });
  }
  app.use('/customer-cb', require('./customer-callbacks'));

  if (isDev) {
    app.use('/view-email-notification', async (req, res) => {
      const { queryContextWithoutAuth: context } = req.app;
      const [email] = await context
        .db('notification_content_email')
        .where({ id: 'b0a5a61e-b350-4e25-aa0e-48470c8d98de' });

      return res.send(email.html);
    });

    app.use('/email-template/:orderSetId', async (req, res) => {
      const { queryContextWithoutAuth: context } = req.app;
      const orderSetId = req.params.orderSetId;
      if (orderSetId) {
        const rendering = await renderConfirmationEmail(
          context,
          orderSetId,
          'PAYMENT_SUCCESS',
          {},
        );
        res.set('Content-Type', 'text/html');
        res.send(Buffer.from(rendering.html));
      } else {
        res.send('bad request');
      }
    });

    app.use('/test', async (req, res) => {
      const { queryContextWithoutAuth: context } = req.app;
      console.log(context);
      return res.send('ok');
    });

    app.use('/sleeping/:sleepTime', async (req, res) => {
      const sleepTime = req.params.sleepTime || 120000;
      await new Promise(r => setTimeout(r, sleepTime));
      return res.send(sleepTime + 'MS Sleeping...');
    });
  }
};